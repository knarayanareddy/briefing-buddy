import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config, validateConfig } from "../_shared/config.ts";
import { authorizeRequest } from "../_shared/auth.ts";

validateConfig();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-api-key, x-user-id, x-preview-user-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

  const userId = auth.user_id;

  try {
    const { question, script_id, segment_id, context_segments } = await req.json();

    if (!question || typeof question !== "string" || question.length > 2000) {
      return new Response(
        JSON.stringify({ error: "Invalid question" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Import orqClient for routed LLM calls
    const { orqCall } = await import("../_shared/orqClient.ts");

    // Fetch grounding evidence if we have a script_id
    let evidenceContext = "";
    const citedSources: Array<{ source_id: string; title: string; url?: string }> = [];

    if (script_id && userId) {
      const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);

      // Get the script to find source IDs
      const { data: script } = await supabase
        .from("briefing_scripts")
        .select("script_json")
        .eq("id", script_id)
        .eq("user_id", userId)
        .single();

      if (script?.script_json?.timeline_segments) {
        const segments = script.script_json.timeline_segments;
        const sourceIds = new Set<string>();

        // If segment_id provided, focus on nearby segments; otherwise use all
        const targetSegments = segment_id
          ? segments.filter((s: any) => {
              const idx = segments.findIndex((seg: any) => seg.segment_id === segment_id);
              const sIdx = segments.indexOf(s);
              return Math.abs(sIdx - idx) <= 2; // Current + 2 neighbors
            })
          : segments;

        targetSegments.forEach((seg: any) => {
          if (seg.grounding_source_id) {
            seg.grounding_source_id.split(",").forEach((id: string) => sourceIds.add(id.trim()));
          }
        });

        if (sourceIds.size > 0) {
          const { data: sources } = await supabase
            .from("synced_items")
            .select("source_id, title, summary, url, provider")
            .eq("user_id", userId)
            .in("source_id", Array.from(sourceIds));

          if (sources && sources.length > 0) {
            evidenceContext = "\n\nEvidence from user's data sources:\n" +
              sources.map((s: any, i: number) => {
                citedSources.push({ source_id: s.source_id, title: s.title || "Untitled", url: s.url });
                return `[${i + 1}] ${s.provider}/${s.source_id}: ${s.title || "Untitled"}\n${s.summary || "(no summary)"}${s.url ? `\nURL: ${s.url}` : ""}`;
              }).join("\n\n");
          }
        }

        // Add segment dialogue context
        const segmentContext = targetSegments
          .map((s: any) => `[Segment ${s.segment_id} - ${s.segment_type}]: ${s.dialogue}`)
          .join("\n");
        evidenceContext = `\n\nCurrent briefing segments:\n${segmentContext}${evidenceContext}`;
      }
    }

    // Also include any inline context segments the frontend sends
    if (context_segments && Array.isArray(context_segments)) {
      const inlineCtx = context_segments
        .map((s: any) => `[Segment ${s.segment_id}]: ${s.dialogue}`)
        .join("\n");
      if (inlineCtx) {
        evidenceContext = `\n\nAdditional context:\n${inlineCtx}${evidenceContext}`;
      }
    }

    const systemPrompt = `You are an AI briefing assistant helping the user understand their morning briefing. 
You have access to the briefing content and underlying evidence sources.

RULES:
- Answer concisely (2-4 sentences unless asked for detail).
- ALWAYS cite evidence when available using [source_id] format.
- If the question is about something not covered in the briefing or evidence, say "Not enough evidence to answer that based on your current briefing data."
- You can suggest actions: "You might want to [action]."
- Be conversational but professional.
${evidenceContext}`;

    let answer: string;
    try {
      const aiResult = await orqCall({
        task_type: "voice_chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
        model: "google/gemini-3-flash-preview",
        stream: false,
      });
      answer = aiResult.choices?.[0]?.message?.content || "I couldn't generate a response.";
    } catch (err: any) {
      if (err.message === "Rate limited") {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (err.message === "Credits exhausted") {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        answer,
        cited_sources: citedSources,
        segment_id: segment_id || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("briefing-voice-chat error:", e?.message);
    return new Response(
      JSON.stringify({ error: e?.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
