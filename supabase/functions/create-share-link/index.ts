import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config, validateConfig } from "../_shared/config.ts";
import { authorizeRequest } from "../_shared/auth.ts";

validateConfig();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-api-key, x-user-id, x-preview-user-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await authorizeRequest(req, config);
  if (!auth.ok) return json(auth.body, auth.status);
  if (!auth.user_id) return json({ error: "unauthorized" }, 401);

  const userId = auth.user_id;
  const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);

  try {
    const {
      script_id,
      job_id,
      expires_in_hours,
      expires_in_days,
      allow_transcript = true,
      allow_action_cards = false,
    } = await req.json();

    if (!script_id || typeof script_id !== "string") {
      return json({ error: "Missing script_id" }, 400);
    }

    // Ownership check: only the script's owner may share it (prevents IDOR).
    const { data: script, error: sErr } = await supabase
      .from("briefing_scripts")
      .select("id")
      .eq("id", script_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (sErr) throw sErr;
    if (!script) return json({ error: "Script not found" }, 404);

    // The client sends expires_in_hours; keep expires_in_days for older callers.
    const hours =
      typeof expires_in_hours === "number" && Number.isFinite(expires_in_hours) && expires_in_hours > 0
        ? expires_in_hours
        : typeof expires_in_days === "number" && Number.isFinite(expires_in_days) && expires_in_days > 0
          ? expires_in_days * 24
          : 24 * 7;

    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from("briefing_shares")
      .insert({
        user_id: userId,
        script_id,
        job_id: job_id || null,
        expires_at: expiresAt.toISOString(),
        scope: "render",
        include_transcript: Boolean(allow_transcript),
        allow_action_cards: Boolean(allow_action_cards),
      })
      .select("id")
      .single();

    if (error) throw error;

    // Relative URL on this app's origin: the client prefixes window.location.origin.
    // (The old absolute URL pointed at a wrong .lovable.app host and /today?t=…,
    // which no route read — the real share route is /share/:token.)
    const shareUrl = `/share/${data.id}`;

    return json({
      share_id: data.id,
      token: data.id,
      share_url: shareUrl,
      expires_at: expiresAt.toISOString(),
    });
  } catch (e: any) {
    console.error("create-share-link error:", e.message);
    return json({ error: e.message || "Failed to create share link" }, 500);
  }
});
