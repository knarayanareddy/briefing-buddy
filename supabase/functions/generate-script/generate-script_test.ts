/**
 * Unit tests for generate-script logic (pure code paths, no network calls).
 * Tests cover:
 * - module state update timestamp logic
 * - deterministic fallback segment shape
 * - grounding validation helper
 */
import { assertEquals, assertExists, assert } from "https://deno.land/std@0.168.0/testing/asserts.ts";

// ── Inlined helpers from generate-script (pure, testable) ────────────────────

function validateSegmentGrounding(parsed: any, allowedIds: string[]): void {
  const ids = String(parsed.grounding_source_id || "")
    .split(",").map((s: string) => s.trim()).filter(Boolean);
  if (ids.length === 0) throw new Error("Missing grounding_source_id");
  const invalid = ids.filter((id: string) => !allowedIds.includes(id));
  if (invalid.length > 0) throw new Error(`Invalid grounding IDs: ${invalid.join(", ")}`);
}

function buildFallbackSegment(segmentId: number, plan: any): any {
  const factValues = Object.values(plan.facts).filter(
    (v: any) => typeof v === "string" || typeof v === "number"
  );
  return {
    segment_id: segmentId,
    dialogue: `${plan.title}. ${(factValues as string[]).slice(0, 2).join(". ")}.`,
    grounding_source_id: plan.grounding_source_ids[0],
    runware_b_roll_prompt: null,
    ui_action_card: plan.ui_action_suggestion,
  };
}

function computeModuleStateRows(
  userId: string,
  enabledModules: string[],
  newsItems: Array<{ published_time_iso: string }>,
  now: string
): Array<{ user_id: string; module_id: string; last_seen_at: string }> {
  let newsDeltaTs = now;
  if (newsItems.length > 0) {
    const newest = newsItems.map(n => n.published_time_iso).sort().reverse()[0];
    if (newest) newsDeltaTs = newest;
  }
  return enabledModules.map(modId => ({
    user_id: userId,
    module_id: modId,
    last_seen_at: modId === "ai_news_delta" ? newsDeltaTs : now,
    updated_at: now,
  }));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

Deno.test("validateSegmentGrounding: valid id passes silently", () => {
  validateSegmentGrounding({ grounding_source_id: "news_1" }, ["news_1", "news_2"]);
  // no throw = pass
});

Deno.test("validateSegmentGrounding: throws on unknown id", () => {
  let threw = false;
  try {
    validateSegmentGrounding({ grounding_source_id: "invented_id" }, ["news_1"]);
  } catch {
    threw = true;
  }
  assert(threw, "Should have thrown for invalid grounding ID");
});

Deno.test("validateSegmentGrounding: throws on empty grounding_source_id", () => {
  let threw = false;
  try {
    validateSegmentGrounding({ grounding_source_id: "" }, ["news_1"]);
  } catch {
    threw = true;
  }
  assert(threw, "Should have thrown for missing grounding ID");
});

Deno.test("fallback segment is well-formed and grounded to plan's first id", () => {
  const plan = {
    plan_id: "news_x",
    title: "AI News",
    facts: { title: "OpenAI releases GPT-5", snippet: "Big news." },
    grounding_source_ids: ["news_1"],
    ui_action_suggestion: { is_active: false, card_type: "link_open", title: "", action_button_text: "", action_payload: "" },
    b_roll_hint: null,
  };
  const seg = buildFallbackSegment(1, plan);
  assertEquals(seg.segment_id, 1);
  assertEquals(seg.grounding_source_id, "news_1");
  assertEquals(seg.runware_b_roll_prompt, null);
  assertEquals(seg.ui_action_card, plan.ui_action_suggestion);
  assert(seg.dialogue.includes("AI News"), "Dialogue should include plan title");
});

Deno.test("module state: ai_news_delta gets newest published_time_iso", () => {
  const now = new Date().toISOString();
  const newsItems = [
    { published_time_iso: "2026-03-20T08:00:00Z" },
    { published_time_iso: "2026-03-21T10:00:00Z" },
    { published_time_iso: "2026-03-19T06:00:00Z" },
  ];
  const rows = computeModuleStateRows("user-1", ["ai_news_delta", "github_prs"], newsItems, now);
  const newsRow = rows.find(r => r.module_id === "ai_news_delta");
  const ghRow = rows.find(r => r.module_id === "github_prs");
  assertEquals(newsRow?.last_seen_at, "2026-03-21T10:00:00Z");
  assertEquals(ghRow?.last_seen_at, now);
});

Deno.test("module state: ai_news_delta falls back to now when news_items empty", () => {
  const now = new Date().toISOString();
  const rows = computeModuleStateRows("user-1", ["ai_news_delta"], [], now);
  assertEquals(rows[0].last_seen_at, now);
});

Deno.test("module state rows keyed by user_id + module_id", () => {
  const now = new Date().toISOString();
  const rows = computeModuleStateRows("user-abc", ["ai_news_delta", "github_prs", "inbox_triage"], [], now);
  assertEquals(rows.length, 3);
  rows.forEach(r => assertEquals(r.user_id, "user-abc"));
  const ids = rows.map(r => r.module_id);
  assert(ids.includes("ai_news_delta"));
  assert(ids.includes("github_prs"));
  assert(ids.includes("inbox_triage"));
});

Deno.test("fallback segment dialogue never includes '#'", () => {
  const plan = {
    plan_id: "gh_1",
    title: "GitHub PR Review",
    facts: { repo: "org/repo", title: "Fix auth bug" },
    grounding_source_ids: ["pr_1"],
    ui_action_suggestion: { is_active: false, card_type: "github_review", title: "", action_button_text: "", action_payload: "" },
    b_roll_hint: null,
  };
  const seg = buildFallbackSegment(2, plan);
  assert(!seg.dialogue.includes("#"), "Fallback dialogue must not contain '#'");
  assert(!seg.ui_action_card.action_payload.includes("#"), "Fallback action_payload must not be '#'");
});
