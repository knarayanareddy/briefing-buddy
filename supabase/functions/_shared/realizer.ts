import { SegmentPlan } from "./planner.ts";

/**
 * Tightened realizer — one segment at a time.
 * ui_action_card is ALWAYS post-overwritten from the plan. The LLM cannot mutate it.
 * runware_b_roll_prompt is forced null when b_roll_hint is null.
 */
export async function realizeSegment(
  segmentId: number,
  plan: SegmentPlan,
  persona: string,
  openaiKey: string
): Promise<any> {
  const systemPrompt = `
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

  const userPayload = {
    facts: plan.facts,
    allowed_grounding_source_ids: plan.grounding_source_ids,
    b_roll_hint: plan.b_roll_hint,
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI error (${response.status}): ${errText.slice(0, 200)}`);
  }

  const result = await response.json();
  const parsed = JSON.parse(result.choices[0].message.content);

  // ALWAYS overwrite ui_action_card — LLM output is discarded entirely for this field
  parsed.ui_action_card = plan.ui_action_suggestion;

  // Enforce b_roll contract
  if (!plan.b_roll_hint) parsed.runware_b_roll_prompt = null;

  return parsed;
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
  openaiKey: string
): Promise<any> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Fix the JSON output for briefing segment ${segmentId}. The allowed grounding IDs are: ${plan.grounding_source_ids.join(", ")}. Return only valid JSON with keys: segment_id, dialogue, grounding_source_id, runware_b_roll_prompt.`,
        },
        { role: "user", content: `Previous output:\n${badOutput}\n\nValidation error:\n${validationError}` },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) throw new Error(`OpenAI repair error: ${response.status}`);

  const result = await response.json();
  const parsed = JSON.parse(result.choices[0].message.content);
  parsed.ui_action_card = plan.ui_action_suggestion;
  if (!plan.b_roll_hint) parsed.runware_b_roll_prompt = null;
  return parsed;
}
