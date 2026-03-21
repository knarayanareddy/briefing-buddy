import { describe, it, expect } from "vitest";
import { validateBriefingScript } from "./briefingSchema";

describe("Briefing Script Validation (Strict Mode)", () => {
  const validScript = {
    script_metadata: {
      persona_applied: "Expert",
      total_estimated_segments: 2,
    },
    timeline_segments: [
      {
        segment_id: 1,
        dialogue: "Hello world",
        grounding_source_id: "source_1",
        runware_b_roll_prompt: null,
        ui_action_card: {
          is_active: true,
          card_type: "link_open",
          title: "Test",
          action_button_text: "Click",
          action_payload: "https://example.com",
        },
      },
      {
        segment_id: 2,
        dialogue: "Second segment",
        grounding_source_id: "source_2",
        runware_b_roll_prompt: "prompt",
        ui_action_card: {
          is_active: false,
          card_type: "weather_widget",
          title: "",
          action_button_text: "",
          action_payload: "",
        },
      },
    ],
  };

  it("should pass for a valid script", () => {
    expect(() => validateBriefingScript(validScript)).not.toThrow();
  });

  it("should fail if segment_id is not sequential", () => {
    const invalid = JSON.parse(JSON.stringify(validScript));
    invalid.timeline_segments[1].segment_id = 3;
    expect(() => validateBriefingScript(invalid)).toThrow(/Non-sequential/);
  });

  it("should fail if total_estimated_segments mismatch", () => {
    const invalid = JSON.parse(JSON.stringify(validScript));
    invalid.script_metadata.total_estimated_segments = 5;
    expect(() => validateBriefingScript(invalid)).toThrow(/Total segments mismatch/);
  });

  it("should fail if unwanted fields are present (strict mode)", () => {
    const invalid = JSON.parse(JSON.stringify(validScript));
    invalid.timeline_segments[0].ui_action_card.description = "unwanted field";
    expect(() => validateBriefingScript(invalid)).toThrow();
  });

  it("should fail if card_type is invalid", () => {
    const invalid = JSON.parse(JSON.stringify(validScript));
    invalid.timeline_segments[0].ui_action_card.card_type = "invalid_type";
    expect(() => validateBriefingScript(invalid)).toThrow();
  });
});
