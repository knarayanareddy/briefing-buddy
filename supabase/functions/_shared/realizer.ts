import { SegmentPlan } from "./planner.ts";
import { orqGenerateJSON } from "./orqClient.ts";

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

/**
 * Tightened realizer — one segment at a time.
 * ui_action_card is ALWAYS post-overwritten from the plan. The LLM cannot mutate it.
 * runware_b_roll_prompt is forced null when b_roll_hint is null.
 * 
 * Routes through orqClient with retry + fallback to direct Lovable AI Gateway.
 */
export async function realizeSegment(
  segmentId: number,
  plan: SegmentPlan,
  persona: string,
  _apiKey: string // kept for signature compat, ignored — uses LOVABLE_API_KEY
): Promise<any> {
  const systemPrompt = buildSystemPrompt(segmentId, persona);
  const userPayload = {
    facts: plan.facts,
    allowed_grounding_source_ids: plan.grounding_source_ids,
    b_roll_hint: plan.b_roll_hint,
  };

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: JSON.stringify(userPayload) },
  ];

  // Try orqClient first (retry + structured validation)
  const orqResult = await orqGenerateJSON({
    task_type: "realize_segment",
    messages,
    model: "google/gemini-3-flash-preview",
    temperature: 0.2,
    validate: (parsed: any) => {
      if (!parsed.dialogue || typeof parsed.dialogue !== "string") throw new Error("Missing dialogue");
      if (!parsed.grounding_source_id) throw new Error("Missing grounding_source_id");
      return parsed;
    },
  });

  if (orqResult) {
    const parsed = orqResult.data;
    parsed.segment_id = segmentId;
    parsed.ui_action_card = plan.ui_action_suggestion;
    if (!plan.b_roll_hint) parsed.runware_b_roll_prompt = null;
    return parsed;
  }

  // Fallback: direct call (same as original implementation)
  console.warn(`realizeSegment fallback for segment ${segmentId}`);
  return await directRealize(segmentId, plan, persona, systemPrompt, userPayload);
}

/**
 * One-shot repair: send the original output + error back to the LLM for a single correction attempt.
 */
export async function repairSegment(
  segmentId: number,
  plan: SegmentPlan,
  badOutput: string,
  validationError: string,
  persona: string,
  _apiKey: string
): Promise<any> {
  const messages = [
    {
      role: "system",
      content: `Fix the JSON output for briefing segment ${segmentId}. The allowed grounding IDs are: ${plan.grounding_source_ids.join(", ")}. Return only valid JSON with keys: segment_id, dialogue, grounding_source_id, runware_b_roll_prompt.`,
    },
    { role: "user", content: `Previous output:\n${badOutput}\n\nValidation error:\n${validationError}` },
  ];

  const orqResult = await orqGenerateJSON({
    task_type: "repair_segment",
    messages,
    model: "google/gemini-3-flash-preview",
    temperature: 0,
  });

  if (orqResult) {
    const parsed = orqResult.data;
    parsed.ui_action_card = plan.ui_action_suggestion;
    if (!plan.b_roll_hint) parsed.runware_b_roll_prompt = null;
    return parsed;
  }

  // Fallback: direct call
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableApiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const response = await fetch(LOVABLE_AI_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages, temperature: 0 }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("AI rate limit exceeded during repair.");
    if (response.status === 402) throw new Error("AI credits exhausted during repair.");
    throw new Error(`AI repair error: ${response.status}`);
  }

  const result = await response.json();
  const content = result.choices[0].message.content;
  const jsonStr = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const parsed = JSON.parse(jsonStr);
  parsed.ui_action_card = plan.ui_action_suggestion;
  if (!plan.b_roll_hint) parsed.runware_b_roll_prompt = null;
  return parsed;
}

// ── Internal helpers ────────────────────────────────────────

function buildSystemPrompt(segmentId: number, persona: string): string {
  return `
You are a concise, professional briefing script writer.
Persona: ${persona}

TASK: Write segment ${segmentId} of a morning briefing.

STRICT RULES:
1. Base your dialogue ONLY on the FACTS provided in the user message. Do not add, invent, or extrapolate.
2. grounding_source_id MUST be one or more values from the allowed_grounding_source_ids list (comma-separated if multiple, no spaces around commas).
3. Do NOT modify or include ui_action_card — it will be injected by the system.
4. runware_b_roll_prompt: if b_roll_hint is null output null. If provided, write a vivid cinematic image prompt.
5. dialogue: 1-3 sentences max. No filler phrases like "Moving on" or "Now let's look at".
6. Output ONLY valid JSON:
{
  "segment_id": ${segmentId},
  "dialogue": "string",
  "grounding_source_id": "string",
  "runware_b_roll_prompt": "string or null"
}
`.trim();
}

async function directRealize(
  segmentId: number,
  plan: SegmentPlan,
  _persona: string,
  systemPrompt: string,
  userPayload: any,
): Promise<any> {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableApiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const response = await fetch(LOVABLE_AI_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    if (response.status === 429) throw new Error("AI rate limit exceeded. Please try again shortly.");
    if (response.status === 402) throw new Error("AI credits exhausted. Please add funds to your workspace.");
    throw new Error(`AI gateway error (${response.status}): ${errText.slice(0, 200)}`);
  }

  const result = await response.json();
  const content = result.choices[0].message.content;
  const jsonStr = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const parsed = JSON.parse(jsonStr);
  parsed.ui_action_card = plan.ui_action_suggestion;
  if (!plan.b_roll_hint) parsed.runware_b_roll_prompt = null;
  return parsed;
}
