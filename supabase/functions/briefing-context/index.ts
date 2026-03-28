import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config, validateConfig } from "../_shared/config.ts";
import { authorizeRequest } from "../_shared/auth.ts";

validateConfig();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-api-key, x-user-id, x-preview-user-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  const auth = await authorizeRequest(req, config);
  if (!auth.ok) {
    return new Response(JSON.stringify(auth.body), {
      status: auth.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = auth.user_id!;
  const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);

  try {
    const url = new URL(req.url);
    const scriptId = url.searchParams.get("script_id");
    const segmentIdParam = url.searchParams.get("segment_id");

    if (!scriptId) {
      return new Response(JSON.stringify({ error: "Missing script_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch script
    const { data: script, error: sErr } = await supabase
      .from("briefing_scripts")
      .select("script_json")
      .eq("id", scriptId)
      .eq("user_id", userId)
      .single();

    if (sErr || !script) {
      return new Response(JSON.stringify({ error: "Script not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allSegments = script.script_json?.timeline_segments || [];
    const segmentId = segmentIdParam ? parseInt(segmentIdParam, 10) : null;

    // Pick relevant segments: current + neighbors
    let relevantSegments = allSegments;
    if (segmentId !== null) {
      const idx = allSegments.findIndex((s: any) => s.segment_id === segmentId);
      if (idx >= 0) {
        const start = Math.max(0, idx - 1);
        const end = Math.min(allSegments.length, idx + 2);
        relevantSegments = allSegments.slice(start, end);
      }
    }

    // Collect source IDs
    const sourceIds = new Set<string>();
    relevantSegments.forEach((seg: any) => {
      if (seg.grounding_source_id) {
        seg.grounding_source_id.split(",").forEach((id: string) => sourceIds.add(id.trim()));
      }
    });

    // Fetch evidence items
    let evidenceItems: any[] = [];
    if (sourceIds.size > 0) {
      const { data } = await supabase
        .from("synced_items")
        .select("source_id, title, summary, url, provider, occurred_at")
        .eq("user_id", userId)
        .in("source_id", Array.from(sourceIds));
      evidenceItems = data || [];
    }

    return new Response(
      JSON.stringify({
        segments: relevantSegments.map((s: any) => ({
          segment_id: s.segment_id,
          segment_type: s.segment_type,
          dialogue: s.dialogue,
          grounding_source_id: s.grounding_source_id,
        })),
        evidence: evidenceItems,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("briefing-context error:", e?.message);
    return new Response(JSON.stringify({ error: e?.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
