import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config, validateConfig } from "../_shared/config.ts";
import { authorizeRequest } from "../_shared/auth.ts";

validateConfig();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-api-key, x-user-id, x-preview-user-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, DELETE, PUT",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await authorizeRequest(req, config);
  if (!auth.ok) {
    return new Response(JSON.stringify(auth.body), { status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // list-history usually needs explicit user from JWT, but internal key works if x-user-id is passed
  if (!auth.user_id) {
    return new Response(JSON.stringify({ error: "User context required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);
  const userId = auth.user_id;

  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Fetch brief scripts, joined with profile and their latest render job
    const { data: scripts, error } = await supabase
      .from("briefing_scripts")
      .select(`
        id,
        created_at,
        persona,
        profile_id,
        trigger,
        scheduled_for,
        title,
        script_json,
        briefing_profiles ( name ),
        render_jobs ( id, status, updated_at, error )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Post-process to extract the latest render_job
    const formattedScripts = scripts.map((script: any) => {
      // Sort render jobs by updated_at descending to get the latest
      const renderJobs = Array.isArray(script.render_jobs) ? script.render_jobs : [script.render_jobs].filter(Boolean);
      renderJobs.sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      
      const latestRenderJob = renderJobs.length > 0 ? renderJobs[0] : null;

      return {
        id: script.id,
        created_at: script.created_at,
        persona: script.persona,
        profile_id: script.profile_id,
        profile_name: script.briefing_profiles?.name || null,
        trigger: script.trigger,
        scheduled_for: script.scheduled_for,
        title: script.title,
        segments_count: Array.isArray(script.script_json?.timeline_segments) 
          ? script.script_json.timeline_segments.length 
          : 0,
        render_job: latestRenderJob
      };
    });

    return new Response(JSON.stringify({ items: formattedScripts, limit, offset }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e: any) {
    console.error("list-history error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
