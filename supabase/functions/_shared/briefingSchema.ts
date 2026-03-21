import { z } from "https://esm.sh/zod@3.22.4";

export const ActionCardSchema = z.object({
  is_active: z.boolean(),
  card_type: z.enum([
    "weather_widget",
    "calendar_join",
    "email_reply",
    "github_review",
    "jira_open",
    "link_open",
    "save_reading_list",
  ]),
  title: z.string(),
  action_button_text: z.string(),
  action_payload: z.string(),
}).strict(); // Enforce no extra fields

export const BriefingSegmentSchema = z.object({
  segment_id: z.number().int().positive(),
  dialogue: z.string().min(1),
  grounding_source_id: z.string().min(1),
  runware_b_roll_prompt: z.string().nullable(),
  ui_action_card: ActionCardSchema,
}).strict(); // Enforce no extra fields

export const BriefingScriptSchema = z.object({
  script_metadata: z.object({
    persona_applied: z.string(),
    total_estimated_segments: z.number().int().positive(),
  }),
  timeline_segments: z.array(BriefingSegmentSchema),
});

export type BriefingScript = z.infer<typeof BriefingScriptSchema>;
export type BriefingSegment = z.infer<typeof BriefingSegmentSchema>;
export type ActionCard = z.infer<typeof ActionCardSchema>;

/**
 * Validates a briefing script against the canonical schema.
 * Throws an error if validation fails.
 */
export function validateBriefingScript(data: any): BriefingScript {
  const script = BriefingScriptSchema.parse(data);

  // Strict validation: sequential IDs starting at 1
  script.timeline_segments.forEach((seg, idx) => {
    if (seg.segment_id !== idx + 1) {
      throw new Error(
        `Non-sequential segment_id: expected ${idx + 1}, got ${seg.segment_id}`
      );
    }
  });

  // Strict validation: total matches
  if (script.script_metadata.total_estimated_segments !== script.timeline_segments.length) {
    throw new Error(
      `Total segments mismatch: metadata says ${script.script_metadata.total_estimated_segments}, but found ${script.timeline_segments.length}`
    );
  }

  return script;
}
