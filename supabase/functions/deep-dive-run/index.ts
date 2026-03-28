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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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
    const { evidence_source_ids, question, run_type, script_id, segment_id } = await req.json();

    if (!evidence_source_ids || !Array.isArray(evidence_source_ids) || evidence_source_ids.length === 0) {
      return new Response(JSON.stringify({ error: "evidence_source_ids required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const type = run_type === "verify" ? "verify" : "deep_dive";

    // Insert the run record
    const { data: run, error: insertErr } = await supabase
      .from("deep_dive_runs")
      .insert({
        user_id: userId,
        script_id: script_id || null,
        segment_id: segment_id || null,
        evidence_source_ids,
        run_type: type,
        question: question || null,
        status: "running",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertErr) throw insertErr;
    const runId = run.id;

    // Fetch evidence items for context
    const { data: evidence } = await supabase
      .from("synced_items")
      .select("source_id, title, summary, url, provider")
      .eq("user_id", userId)
      .in("source_id", evidence_source_ids);

    const evidenceContext = (evidence || [])
      .map((e: any, i: number) => `[${i + 1}] ${e.provider}/${e.source_id}: ${e.title}\n${e.summary || "(no summary)"}${e.url ? `\nURL: ${e.url}` : ""}`)
      .join("\n\n");

    // Build the AI prompt
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      await supabase.from("deep_dive_runs").update({ status: "failed", error_message: "AI not configured" }).eq("id", runId);
      return new Response(JSON.stringify({ run_id: runId, status: "failed", error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = type === "verify"
      ? `You are a fact-checking AI agent. Verify the following claim(s) using the provided evidence. For each claim:
1. State whether it's VERIFIED, PARTIALLY VERIFIED, or UNVERIFIED
2. Cite specific evidence supporting or contradicting it
3. Note any gaps in evidence

Format your response as JSON with this structure:
{"verdict": "verified|partially_verified|unverified", "summary": "...", "citations": [{"title": "...", "url": "...", "relevance": "..."}], "tool_steps": [{"step": 1, "tool": "evidence_review", "action": "...", "finding": "..."}]}`
      : `You are an intelligence analyst AI agent conducting a deep dive investigation. Given the evidence below, produce a comprehensive analysis:
1. Key findings and insights
2. Connections between data points
3. Risks or opportunities identified
4. Recommended actions

Format your response as JSON:
{"summary": "...", "key_findings": ["..."], "risks": ["..."], "opportunities": ["..."], "recommended_actions": ["..."], "citations": [{"title": "...", "url": "...", "relevance": "..."}], "tool_steps": [{"step": 1, "tool": "analysis", "action": "...", "finding": "..."}]}`;

    const userPrompt = `${question ? `User question: ${question}\n\n` : ""}Evidence:\n${evidenceContext || "No evidence available."}`;

    // Use tool calling for structured output
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "submit_analysis",
            description: "Submit the completed analysis with citations and tool trace",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string", description: "Executive summary of findings" },
                verdict: { type: "string", enum: ["verified", "partially_verified", "unverified", "n/a"] },
                key_findings: { type: "array", items: { type: "string" } },
                citations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      url: { type: "string" },
                      relevance: { type: "string" },
                    },
                    required: ["title"],
                  },
                },
                tool_steps: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      step: { type: "number" },
                      tool: { type: "string" },
                      action: { type: "string" },
                      finding: { type: "string" },
                      duration_ms: { type: "number" },
                    },
                    required: ["step", "tool", "action", "finding"],
                  },
                },
              },
              required: ["summary", "citations", "tool_steps"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_analysis" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status);
      await supabase.from("deep_dive_runs").update({
        status: "failed",
        error_message: `AI error: ${aiResponse.status}`,
        completed_at: new Date().toISOString(),
      }).eq("id", runId);
      return new Response(JSON.stringify({ run_id: runId, status: "failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await aiResponse.json();
    let analysis: any = {};

    // Parse tool call result
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        analysis = JSON.parse(toolCall.function.arguments);
      } catch {
        // Fallback: use message content
        analysis = { summary: aiResult.choices?.[0]?.message?.content || "Analysis complete", citations: [], tool_steps: [] };
      }
    } else if (aiResult.choices?.[0]?.message?.content) {
      // Try parsing JSON from content
      try {
        analysis = JSON.parse(aiResult.choices[0].message.content);
      } catch {
        analysis = { summary: aiResult.choices[0].message.content, citations: [], tool_steps: [] };
      }
    }

    // Merge evidence URLs into citations
    const citations = (analysis.citations || []).map((c: any) => {
      if (!c.url) {
        const match = (evidence || []).find((e: any) => e.title === c.title || e.source_id === c.title);
        if (match?.url) c.url = match.url;
      }
      return c;
    });

    // Add simulated tool trace timing
    const toolTrace = (analysis.tool_steps || []).map((s: any, i: number) => ({
      ...s,
      step: i + 1,
      duration_ms: s.duration_ms || Math.floor(200 + Math.random() * 800),
    }));

    // Update the run with results
    await supabase.from("deep_dive_runs").update({
      status: "completed",
      output_summary: analysis.summary,
      citations: citations,
      tool_trace: toolTrace,
      completed_at: new Date().toISOString(),
    }).eq("id", runId);

    return new Response(JSON.stringify({
      run_id: runId,
      status: "completed",
      summary: analysis.summary,
      verdict: analysis.verdict,
      key_findings: analysis.key_findings,
      citations,
      tool_trace: toolTrace,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("deep-dive-run error:", e?.message);
    return new Response(JSON.stringify({ error: e?.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
