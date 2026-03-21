import { redactSecrets } from "./sanitize.ts";

export interface BriefingScript {
  script_metadata: {
    persona_applied: string;
    total_estimated_segments: number;
  };
  timeline_segments: Array<{
    segment_id: number;
    dialogue: string;
    grounding_source_id: string;
    runware_b_roll_prompt: string | null;
    ui_action_card: {
      is_active: boolean;
      card_type: string;
      title: string;
      action_button_text: string;
      action_payload: string;
    };
  }>;
}

/**
 * Generates a deterministic fallback script when the LLM fails.
 * Uses only sanitized user_data and real grounding source IDs.
 */
export function generateFallbackScript(
  persona: string,
  userData: any,
  allowedIds: string[]
): BriefingScript {
  const segments = [];
  const maxSegments = Math.min(allowedIds.length, 5);

  for (let i = 0; i < maxSegments; i++) {
    const sourceId = allowedIds[i];
    // Attempt to find a title from the user data for the dialogue
    let title = "Update";
    if (userData.calendar) {
      const cal = userData.calendar.find((c: any) => c.id === sourceId);
      if (cal) title = cal.title;
    }
    if (userData.tasks && title === "Update") {
      const task = userData.tasks.find((t: any) => t.id === sourceId);
      if (task) title = task.title;
    }

    segments.push({
      segment_id: i + 1,
      dialogue: redactSecrets(`Regarding your record ${sourceId}: ${title}. We've prepared the necessary context for your review.`),
      grounding_source_id: sourceId,
      runware_b_roll_prompt: i === 0 ? "Professional workspace, minimalist desk setup, high-resolution" : null,
      ui_action_card: {
        is_active: true,
        card_type: "link_open",
        title: title.slice(0, 30),
        action_button_text: "Review Source",
        action_payload: "#",
      },
    });
  }

  // Final catch-all if no IDs were found
  if (segments.length === 0) {
    segments.push({
      segment_id: 1,
      dialogue: "Good morning. We've encountered a slight retrieval delay, but your system perimeter is secure.",
      grounding_source_id: "system_status",
      runware_b_roll_prompt: null,
      ui_action_card: {
        is_active: false,
        card_type: "link_open",
        title: "Status Normal",
        action_button_text: "",
        action_payload: "",
      },
    });
  }

  return {
    script_metadata: {
      persona_applied: persona,
      total_estimated_segments: segments.length,
    },
    timeline_segments: segments,
  };
}
