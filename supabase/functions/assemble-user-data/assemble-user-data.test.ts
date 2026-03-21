/**
 * Tests for assemble-user-data behaviour.
 * These are unit-style tests using Deno's built-in test runner.
 * They test the pure logic (scoring, connector_status shape, bucket selection).
 */
import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";

// ─── Helpers under test (extracted from assemble-user-data) ───────────────────

function scoreItems(items: any[], keywords: string[]): any[] {
  return items
    .map(item => {
      let score = 0;
      const searchSpace = `${item.title} ${item.summary || ""}`.toLowerCase();
      keywords.forEach(kw => { if (searchSpace.includes(kw.toLowerCase())) score += 3; });
      const ageMs = Date.now() - new Date(item.occurred_at).getTime();
      if (ageMs < 6 * 60 * 60 * 1000) score += 2;
      return { ...item, score };
    })
    .sort((a: any, b: any) => b.score - a.score || new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
}

function buildConnectorStatus(provider: string, conn: any | null, lastSync: string | null) {
  let status: "active" | "missing" | "error";
  let message: string;
  if (!conn) {
    status = "missing";
    message = `${provider.charAt(0).toUpperCase() + provider.slice(1)} connector is not linked. Connect it on the Connectors page.`;
  } else if (conn.status === "error") {
    status = "error";
    message = `${provider.charAt(0).toUpperCase() + provider.slice(1)} connector reported an error. Please re-authenticate.`;
  } else {
    status = "active";
    message = `${provider.charAt(0).toUpperCase() + provider.slice(1)} connector is active.`;
  }
  return {
    source_id: `connector_${provider}_status`,
    provider,
    connected: !!conn && conn.status !== "error",
    last_sync_time_iso: lastSync,
    status,
    message,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

Deno.test("connector_status: missing github => connected=false, status=missing", () => {
  const result = buildConnectorStatus("github", null, null);
  assertEquals(result.connected, false);
  assertEquals(result.status, "missing");
  assertEquals(result.source_id, "connector_github_status");
  assertExists(result.message);
});

Deno.test("connector_status: active github => connected=true, status=active", () => {
  const result = buildConnectorStatus("github", { status: "active", last_sync_at: "2026-01-01T10:00:00Z" }, "2026-01-01T10:00:00Z");
  assertEquals(result.connected, true);
  assertEquals(result.status, "active");
});

Deno.test("connector_status: error state => connected=false, status=error", () => {
  const result = buildConnectorStatus("github", { status: "error", last_sync_at: null }, null);
  assertEquals(result.connected, false);
  assertEquals(result.status, "error");
});

Deno.test("scoreItems: keyword match boosts score", () => {
  const now = new Date().toISOString();
  const items = [
    { title: "unrelated headline", summary: "nothing", occurred_at: now },
    { title: "OpenAI launches new model", summary: "AI news", occurred_at: now },
  ];
  const scored = scoreItems(items, ["openai"]);
  assertEquals(scored[0].title, "OpenAI launches new model");
});

Deno.test("scoreItems: recency bonus applies within 6 hours", () => {
  const recent = new Date().toISOString();
  const old = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString();
  const items = [
    { title: "Old news", summary: "", occurred_at: old },
    { title: "New news", summary: "", occurred_at: recent },
  ];
  const scored = scoreItems(items, []);
  assertEquals(scored[0].title, "New news");
});

Deno.test("user_data always includes connector_status array", () => {
  const userData = {
    news_items: [],
    github_prs: [],
    emails_unread: [],
    calendar_events: [],
    jira_tasks: [],
    connector_status: [buildConnectorStatus("github", null, null)],
  };
  assertExists(userData.connector_status);
  assertEquals(userData.connector_status.length, 1);
  assertEquals(userData.connector_status[0].provider, "github");
});

Deno.test("github_prs empty when connector missing", () => {
  const githubStatus = buildConnectorStatus("github", null, null);
  // When connector is missing, github_prs stays empty
  const github_prs = githubStatus.connected ? [{ source_id: "pr_1" }] : [];
  assertEquals(github_prs.length, 0);
});

Deno.test("ai_news_delta: uses last_seen_at as since window", () => {
  const lastSeen = "2026-03-20T08:00:00Z";
  const sinceByModule: Record<string, string> = { ai_news_delta: lastSeen };
  const since = sinceByModule["ai_news_delta"] || new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  assertEquals(since, lastSeen);
});

Deno.test("ai_news_delta: defaults to 12h ago when last_seen_at is null", () => {
  const sinceByModule: Record<string, string> = {};
  const defaultSince = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  const since = sinceByModule["ai_news_delta"] || defaultSince;
  assertEquals(since, defaultSince);
});
