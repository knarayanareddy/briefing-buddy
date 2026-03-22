import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config, validateConfig } from "../_shared/config.ts";

validateConfig();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-api-key, x-user-id, x-preview-user-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, DELETE, PUT",
};

function isProfileDue(profile: any, now: Date): { due: boolean; scheduledFor: string } {
  const tz = profile.timezone || "America/Los_Angeles";
  
  let formattedTime;
  let localDateStr;
  try {
      formattedTime = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false }).format(now);
      localDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(now);
  } catch (e) {
      // fallback to UTC if timezone invalid
      formattedTime = new Intl.DateTimeFormat('en-US', { timeZone: "UTC", hour: 'numeric', hour12: false }).format(now);
      localDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: "UTC" }).format(now);
  }
  
  const localHour = parseInt(formattedTime.split(' ')[0] || formattedTime, 10);
  const freq = profile.frequency;
  const lastTriggered = profile.last_triggered_at ? new Date(profile.last_triggered_at) : null;
  
  if (freq === 'hourly') {
    const scheduledFor = new Date(now);
    scheduledFor.setMinutes(0,0,0);
    if (lastTriggered && (now.getTime() - lastTriggered.getTime()) / 60000 < 55) {
      return { due: false, scheduledFor: "" };
    }
    return { due: true, scheduledFor: scheduledFor.toISOString() };
  }
  
  if (freq === 'daily') {
    if (localHour < 7) return { due: false, scheduledFor: "" };
    const scheduledFor = `${localDateStr}T07:00:00Z`; 
    
    if (lastTriggered) {
      // Check if we already fired today
      let lastDateStr;
      try { lastDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(lastTriggered); } 
      catch (e) { lastDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: "UTC" }).format(lastTriggered); }
      if (lastDateStr === localDateStr) return { due: false, scheduledFor: "" };
    }
    return { due: true, scheduledFor };
  }
  
  if (freq === 'twice_daily') {
    if (localHour < 7) return { due: false, scheduledFor: "" };
    let slotHour = "07";
    if (localHour >= 16) slotHour = "16";
    const scheduledFor = `${localDateStr}T${slotHour}:00:00Z`;
    
    if (lastTriggered) {
      if ((now.getTime() - lastTriggered.getTime()) / 3600000 < 6) {
        return { due: false, scheduledFor: "" };
      }
    }
    return { due: true, scheduledFor };
  }
  
  return { due: false, scheduledFor: "" };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const internalKey = req.headers.get("x-internal-api-key");
  if (!internalKey || internalKey !== config.INTERNAL_API_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { 
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);
  
  try {
    const body = await req.json().catch(() => ({}));
    const targetUserId = req.headers.get("x-user-id");
    const targetProfileId = body.profile_id;
    
    let query = supabase.from("briefing_profiles").select("*").neq("frequency", "manual");
    if (targetUserId && targetProfileId) {
      query = query.eq("user_id", targetUserId).eq("id", targetProfileId);
    }

    const { data: profiles, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;

    const now = new Date();
    const results = [];

    for (const profile of profiles) {
      const { due, scheduledFor } = isProfileDue(profile, now);
      if (!due && !(targetUserId && targetProfileId)) {
        // Only skip if not forced
        continue;
      }

      const activeScheduledFor = (targetUserId && targetProfileId) ? now.toISOString() : scheduledFor;

      // 1. Lock / Insert Run
      const { data: run, error: runErr } = await supabase.from("briefing_runs").insert({
        user_id: profile.user_id,
        profile_id: profile.id,
        frequency: profile.frequency,
        trigger: "scheduled",
        scheduled_for: activeScheduledFor,
        status: "running"
      }).select().single();

      if (runErr) {
        if (runErr.code === '23505') { // Unique violation
          results.push({ profile_id: profile.id, status: "skipped (already scheduled for slot)" });
          continue;
        }
        results.push({ profile_id: profile.id, error: runErr.message });
        continue;
      }

      // 2. Connector Sync (Best Effort)
      try {
        const syncUrl = `${config.SUPABASE_URL}/functions/v1/sync-required-connectors`;
        await fetch(syncUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-api-key": config.INTERNAL_API_KEY!,
            "x-user-id": profile.user_id,
          },
          body: JSON.stringify({ profile_id: profile.id, mode: "best_effort" })
        });
      } catch (err: any) {
        console.warn(`Sync failed for profile ${profile.id}:`, err.message);
      }

      // 3. Generate script
      try {
        const genUrl = `${config.SUPABASE_URL}/functions/v1/generate-script`;
        const genRes = await fetch(genUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-api-key": config.INTERNAL_API_KEY!,
            "x-user-id": profile.user_id,
          },
          body: JSON.stringify({ 
            profile_id: profile.id,
            trigger: "scheduled",
            scheduled_for: activeScheduledFor,
            title: profile.name || "Daily Briefing"
          })
        });

        const outcome = await genRes.json();
        
        if (!genRes.ok) {
           throw new Error(outcome.error || "Generation failed");
        }

        let renderJobId = null;
        // 4. Optionally Start Render
        const autoRender = profile.module_settings?.briefing?.auto_render === true;
        if (autoRender && outcome.script_id) {
          try {
            const renderUrl = `${config.SUPABASE_URL}/functions/v1/start-render`;
            const renderRes = await fetch(renderUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-internal-api-key": config.INTERNAL_API_KEY!,
                "x-user-id": profile.user_id,
              },
              body: JSON.stringify({ script_id: outcome.script_id })
            });
            if (renderRes.ok) {
              const renderOut = await renderRes.json();
              renderJobId = renderOut.job_id;
            }
          } catch (err: any) {
             console.warn(`Auto-render failed for script ${outcome.script_id}:`, err.message);
          }
        }

        // 5. Mark complete and update profile
        await supabase.from("briefing_runs").update({ 
          status: "complete", 
          completed_at: new Date().toISOString(),
          script_id: outcome.script_id,
          render_job_id: renderJobId
        }).eq("id", run.id);

        await supabase.from("briefing_profiles").update({
          last_triggered_at: now.toISOString()
        }).eq("id", profile.id);

        results.push({ profile_id: profile.id, status: "success", script_id: outcome.script_id });

      } catch (e: any) {
        await supabase.from("briefing_runs").update({ 
          status: "failed", 
          completed_at: new Date().toISOString(),
          error: e.message
        }).eq("id", run.id);
        results.push({ profile_id: profile.id, status: "failed", error: e.message });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e: any) {
    console.error("scheduled-briefings error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
