import { assertEquals, assert } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { planSegments, SegmentPlan } from "../_shared/planner.ts";
import { AssembledUserData } from "../_shared/userData.ts";
import { ModuleId } from "../_shared/moduleCatalog.ts";

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeNews(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    source_id: `news_${i + 1}`,
    title: `Headline ${i + 1}`,
    source_name: "TechFeed",
    url: `https://example.com/news/${i + 1}`,
    published_time_iso: new Date().toISOString(),
    snippet: `Snippet for news ${i + 1}`,
  }));
}

function makePRs(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    source_id: `pr_${i + 1}`,
    repo: `org/repo-${i + 1}`,
    title: `Fix bug ${i + 1}`,
    url: `https://github.com/org/repo-${i + 1}/pull/${i + 1}`,
    author_display: "dev",
    status: "open",
    updated_time_iso: new Date().toISOString(),
  }));
}

const baseUserData: AssembledUserData = {
  news_items: [],
  github_prs: [],
  emails_unread: [],
  calendar_events: [],
  jira_tasks: [],
  connector_status: [],
};

// ── Tests ─────────────────────────────────────────────────────────────────────

Deno.test("given 5 news with cap=3 => 1 digest + 3 items = 4 news plans + wrap", () => {
  const userData: AssembledUserData = { ...baseUserData, news_items: makeNews(5) };
  const plans = planSegments({
    enabledModules: ["ai_news_delta"] as ModuleId[],
    moduleSettings: { ai_news_delta: { caps: 3 } },
    userData,
  });
  const newsDigs = plans.filter(p => p.segment_kind === "news_digest");
  const newsItems = plans.filter(p => p.segment_kind === "news_item");
  const wraps = plans.filter(p => p.segment_kind === "wrap");
  assertEquals(newsDigs.length, 1);
  assertEquals(newsItems.length, 3);
  assertEquals(wraps.length, 1);
});

Deno.test("given 3 PRs with default cap=2 => 1 digest + 2 PR items", () => {
  const userData: AssembledUserData = { ...baseUserData, github_prs: makePRs(3) };
  const plans = planSegments({
    enabledModules: ["github_prs"] as ModuleId[],
    moduleSettings: {},
    userData,
  });
  const ghDig = plans.filter(p => p.segment_kind === "github_digest");
  const ghItems = plans.filter(p => p.segment_kind === "github_pr");
  assertEquals(ghDig.length, 1);
  assertEquals(ghItems.length, 2);
});

Deno.test("empty data produces no plans (no wrap)", () => {
  const plans = planSegments({
    enabledModules: ["ai_news_delta", "github_prs"] as ModuleId[],
    moduleSettings: {},
    userData: baseUserData,
  });
  assertEquals(plans.length, 0);
});

Deno.test("no action_payload is '#' anywhere", () => {
  const userData: AssembledUserData = { ...baseUserData, news_items: makeNews(3), github_prs: makePRs(2) };
  const plans = planSegments({
    enabledModules: ["ai_news_delta", "github_prs"] as ModuleId[],
    moduleSettings: {},
    userData,
  });
  for (const p of plans) {
    assert(p.ui_action_suggestion.action_payload !== "#", `Plan ${p.plan_id} has action_payload="#"`);
  }
});

Deno.test("wrap grounding references only real source_ids from earlier plans", () => {
  const news = makeNews(2);
  const userData: AssembledUserData = { ...baseUserData, news_items: news };
  const plans = planSegments({
    enabledModules: ["ai_news_delta"] as ModuleId[],
    moduleSettings: {},
    userData,
  });
  const wrap = plans.find(p => p.segment_kind === "wrap");
  assert(wrap, "wrap segment must exist");
  const allRealIds = new Set(news.map(n => n.source_id));
  for (const id of wrap!.grounding_source_ids) {
    assert(allRealIds.has(id), `Wrap references unknown source_id: ${id}`);
  }
});

Deno.test("missing github connector => connector_missing segment emitted, github_prs empty", () => {
  const userData: AssembledUserData = {
    ...baseUserData,
    github_prs: [],
    connector_status: [{
      source_id: "connector_github_status",
      provider: "github",
      connected: false,
      last_sync_time_iso: null,
      status: "missing",
      message: "GitHub connector is not linked.",
    }],
  };
  const plans = planSegments({
    enabledModules: ["github_prs"] as ModuleId[],
    moduleSettings: {},
    userData,
  });
  const missing = plans.filter(p => p.segment_kind === "connector_missing");
  const ghItems = plans.filter(p => p.segment_kind === "github_pr");
  assertEquals(missing.length, 1);
  assertEquals(ghItems.length, 0);
  assertEquals(missing[0].grounding_source_ids[0], "connector_github_status");
});

Deno.test("inactive actions have empty string payload, not '#'", () => {
  const news = makeNews(1).map(n => ({ ...n, url: "" }));
  const userData: AssembledUserData = { ...baseUserData, news_items: news };
  const plans = planSegments({
    enabledModules: ["ai_news_delta"] as ModuleId[],
    moduleSettings: {},
    userData,
  });
  const items = plans.filter(p => p.segment_kind === "news_item");
  assertEquals(items.length, 1);
  assertEquals(items[0].ui_action_suggestion.is_active, false);
  assertEquals(items[0].ui_action_suggestion.action_payload, "");
});

Deno.test("focus_plan only emits when actionable items exist from earlier plans", () => {
  const news = makeNews(2);
  const userData: AssembledUserData = { ...baseUserData, news_items: news };

  // With ai_news_delta enabled → items have real URLs → focus_plan should emit
  const plans = planSegments({
    enabledModules: ["ai_news_delta", "focus_plan"] as ModuleId[],
    moduleSettings: {},
    userData,
  });
  const focus = plans.filter(p => p.segment_kind === "focus_plan");
  assertEquals(focus.length, 1);

  // With no data → nothing → focus_plan must NOT emit
  const emptyPlans = planSegments({
    enabledModules: ["focus_plan"] as ModuleId[],
    moduleSettings: {},
    userData: baseUserData,
  });
  assertEquals(emptyPlans.length, 0);
});
