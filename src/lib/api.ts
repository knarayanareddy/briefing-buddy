import { supabase } from "@/integrations/supabase/client";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const FUNCTIONS_BASE = `https://${PROJECT_ID}.supabase.co/functions/v1`;

let internalApiKey = "";
export const setInternalApiKey = (key: string) => { internalApiKey = key; };
export const getInternalApiKey = () => internalApiKey;

async function callEdgeFunction<T>(
  fnName: string,
  options: { method?: string; body?: unknown; params?: Record<string, string> } = {}
): Promise<T> {
  const { method = "POST", body, params } = options;
  const url = new URL(`${FUNCTIONS_BASE}/${fnName}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;

  const demoAuthMode = import.meta.env.VITE_DEMO_AUTH_MODE || "internal_key";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };

  if (session) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  } else if (demoAuthMode === "internal_key") {
    // Fallback to internal key for technical preview
    headers["x-internal-api-key"] = internalApiKey || "hackathon_unlocked_preview_2024";
    headers["x-preview-user-id"] = "00000000-0000-0000-0000-000000000000";
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Edge function ${fnName} failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function generateScript(userPreferences: unknown, userData: unknown, profileId?: string | null) {
  return callEdgeFunction<{ script_id: string; script_json: unknown }>("generate-script", {
    body: {
      user_preferences: userPreferences,
      user_data: userData,
      ...(profileId ? { profile_id: profileId } : {}),
    },
  });
}

export async function previewPlan(profileId: string) {
  try {
    return await callEdgeFunction<{ 
      profile_id: string; 
      plan_summary: { 
        total_segments: number; 
        by_module: Array<{ module_id: string; segments: number }>;
        ordered: Array<{
          order_index: number;
          segment_kind: string;
          title: string;
          grounding_source_ids: string[];
          action?: { is_active: boolean; card_type: string; title: string; action_button_text: string };
        }>;
      };
      connector_status: Array<{ provider: string; status: string }>;
    }>("preview-plan", {
      body: { profile_id: profileId },
    });
  } catch (err) {
    console.warn("Edge function 'preview-plan' failed, falling back to mock data", err);
    return {
      profile_id: profileId,
      plan_summary: {
        total_segments: 3,
        by_module: [
          { module_id: "rss", segments: 1 },
          { module_id: "github", segments: 1 },
          { module_id: "gmail", segments: 1 }
        ],
        ordered: [
          {
            order_index: 0,
            segment_kind: "intro",
            title: "Executive Technical Overview",
            grounding_source_ids: ["system:briefing_meta"]
          },
          {
            order_index: 1,
            segment_kind: "technical_deep_dive",
            title: "Infrastructure Scaling Signals",
            grounding_source_ids: ["rss:hn_top", "rss:tech_memex"]
          },
          {
            order_index: 2,
            segment_kind: "action_item",
            title: "Pending Security Patch Review",
            grounding_source_ids: ["github:audit_log"],
            action: {
              is_active: true,
              card_type: "security",
              title: "Critical Patch v2.4.1",
              action_button_text: "APPROVE DEPLOY"
            }
          }
        ]
      },
      connector_status: [
        { provider: "rss", status: "connected" },
        { provider: "github", status: "connected" },
        { provider: "gmail", status: "degraded" }
      ]
    };
  }
}

export async function startRender(scriptId: string) {
  return callEdgeFunction<{ job_id: string }>("start-render", {
    body: { script_id: scriptId },
  });
}

export interface SegmentStatus {
  segment_id: number;
  avatar_video_url: string | null;
  b_roll_image_url: string | null;
  ui_action_card: unknown;
  dialogue: string;
  grounding_source_id: string;
  status: string;
  error: string | null;
}

export interface JobStatusResponse {
  status: string;
  progress?: {
    total: number;
    queued: number;
    rendering: number;
    complete: number;
    failed: number;
    percent_complete: number;
  };
  segments: SegmentStatus[];
}

export async function getJobStatus(jobId: string) {
  return callEdgeFunction<JobStatusResponse>("job-status", {
    method: "GET",
    params: { job_id: jobId },
  });
}

export async function triggerRenderWorker(jobId: string, maxSegments: number = 1) {
  return callEdgeFunction<{ ok: boolean; status: string }>("render-worker", {
    body: { job_id: jobId, max_segments: maxSegments },
  });
}

export async function syncNews() {
  return callEdgeFunction<{ ok: boolean; items_synced: number }>("sync-news", {});
}

export async function syncGithub() {
  return callEdgeFunction<{ ok: boolean; items_synced: number }>("sync-github", {});
}

export async function triggerSync(provider: string) {
  const fnMap: Record<string, string> = {
    rss: "sync-news",
    github: "sync-github",
    google: "sync-gmail",
    slack: "sync-slack"
  };
  const fnName = fnMap[provider] || `sync-${provider}`;
  return callEdgeFunction<{ ok: boolean; items_synced: number }>(fnName, {});
}

export async function syncRequiredConnectors(profileId: string, mode: "best_effort" | "force" = "best_effort") {
  return callEdgeFunction<{ profile_id: string; required_providers: string[]; results: any[] }>(
    "sync-required-connectors",
    { body: { profile_id: profileId, mode } }
  );
}

export async function assembleUserData() {
  return callEdgeFunction<{ user_data: unknown; meta: unknown }>("assemble-user-data", {});
}

export interface BriefingProfile {
  id: string;
  name: string;
  persona: string | null;
  timezone: string | null;
  frequency: string | null;
  enabled_modules: string[];
  module_settings: Record<string, any>;
  updated_at: string;
}

export async function getProfiles() {
  try {
    return await callEdgeFunction<BriefingProfile[]>("get-profiles", { method: "GET" });
  } catch (err) {
    console.warn("Edge function 'get-profiles' failed, returning empty array", err);
    return [];
  }
}

export async function upsertProfile(profile: Partial<BriefingProfile>) {
  return callEdgeFunction<BriefingProfile>("upsert-profile", { body: profile });
}

export async function deleteProfile(id: string) {
  return callEdgeFunction<{ success: boolean }>("delete-profile", { body: { id } });
}

export interface PublicModuleDefinition {
  id: string;
  label: string;
  description: string;
  availability: "ready" | "beta" | "coming_soon";
  requiredConnectors: Array<{ provider: string; optional?: boolean }>;
  defaults: {
    maxSegments: number;
    settings: Record<string, any>;
  };
  settingsUi: Array<{
    key: string;
    label: string;
    type: "number" | "text" | "multiselect";
    options?: string[];
  }>;
}

export async function getModuleCatalog() {
  try {
    return await callEdgeFunction<PublicModuleDefinition[]>("get-module-catalog", { method: "GET" });
  } catch (err) {
    console.warn("Edge function 'get-module-catalog' failed, returning mocks", err);
    return [
      {
        id: "rss",
        label: "Technical RSS Feeds",
        description: "Monitor specific engineering blogs and major tech news aggregators.",
        availability: "ready",
        requiredConnectors: [{ provider: "rss" }],
        defaults: { maxSegments: 2, settings: { urls: [] } },
        settingsUi: [{ key: "urls", label: "Feed URLs", type: "multiselect" }]
      },
      {
        id: "github",
        label: "GitHub Repository Tracking",
        description: "Review repository activity, PRs, and critical issue alerts.",
        availability: "ready",
        requiredConnectors: [{ provider: "github" }],
        defaults: { maxSegments: 3, settings: { repos: [] } },
        settingsUi: [{ key: "repos", label: "Repository Paths", type: "multiselect" }]
      },
      {
        id: "gmail",
        label: "Gmail Intelligence Filters",
        description: "Synthesize high-priority alerts and executive escalations.",
        availability: "beta",
        requiredConnectors: [{ provider: "google" }],
        defaults: { maxSegments: 2, settings: { keywords: [] } },
        settingsUi: [{ key: "keywords", label: "Filter Keywords", type: "multiselect" }]
      }
    ] as any;
  }
}

export async function addToReadingList(item: { source_id: string; title: string; url: string }) {
  try {
    return await callEdgeFunction<any>("manage-reading-list", {
      body: { action: "add", item }
    });
  } catch (err) {
    console.warn("Edge function failed, falling back to localStorage mock", err);
    const mockList = JSON.parse(localStorage.getItem("mock_reading_list") || "[]");
    const newItem = { ...item, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    const filtered = mockList.filter((i: any) => i.source_id !== item.source_id);
    const updated = [newItem, ...filtered];
    localStorage.setItem("mock_reading_list", JSON.stringify(updated));
    return newItem;
  }
}

export async function removeFromReadingList(sourceId: string) {
  try {
    return await callEdgeFunction<any>("manage-reading-list", {
      body: { action: "delete", item: { source_id: sourceId } }
    });
  } catch (err) {
    console.warn("Edge function failed, falling back to localStorage mock", err);
    const mockList = JSON.parse(localStorage.getItem("mock_reading_list") || "[]");
    const updated = mockList.filter((item: any) => item.source_id !== sourceId);
    localStorage.setItem("mock_reading_list", JSON.stringify(updated));
    return { success: true };
  }
}

export async function getReadingList() {
  try {
    return await callEdgeFunction<any[]>("manage-reading-list", { method: "GET" });
  } catch (err) {
    console.warn("Edge function failed, falling back to localStorage mock", err);
    return JSON.parse(localStorage.getItem("mock_reading_list") || "[]");
  }
}

export async function getConnectorStatus() {
  return callEdgeFunction<Array<{
    provider: string;
    status: string;
    connected: boolean;
    last_attempt_at: string | null;
    last_success_at: string | null;
    items_synced_last_run: number;
    last_error_message: string | null;
    last_run?: {
      outcome: string;
      finished_at: string | null;
      items_upserted: number;
    }
  }>>("connector-status", { method: "GET" });
}

export async function testConnector(provider: string, config: any) {
  return callEdgeFunction<{ ok: boolean; message: string }>("test-connector", {
    body: { provider, config }
  });
}

export async function updateConnectorConfig(type: string, config: any) {
  return callEdgeFunction<any>("update-connector-config", {
    body: { type, config }
  });
}

export async function getConnectorConfig(provider: string) {
  const { data, error } = await (supabase as any)
    .from("connector_configs")
    .select("config")
    .eq("provider", provider)
    .maybeSingle();
  if (error) throw error;
  return data?.config || null;
}

export async function disconnectConnector(provider: string) {
  return callEdgeFunction<any>("disconnect-connector", {
    body: { provider }
  });
}

export async function startGoogleOAuth(redirect_url: string) {
  return callEdgeFunction<{url: string}>("google-oauth-start", {
    method: "POST",
    body: { redirect_url }
  });
}

export async function completeGoogleOAuth(code: string, state: string) {
  return callEdgeFunction<{ok: boolean}>("google-oauth-callback", {
    method: "POST",
    body: { code, state }
  });
}

export interface HistoryItem {
  id: string;
  created_at: string;
  persona: string;
  profile_id: string | null;
  profile_name: string | null;
  trigger: string;
  scheduled_for: string | null;
  title: string | null;
  segments_count: number;
  render_job: {
    id: string;
    status: string;
    updated_at: string;
    error: string | null;
  } | null;
}

export async function listHistory(limit = 50, offset = 0) {
  return callEdgeFunction<{ items: HistoryItem[]; limit: number; offset: number }>("list-history", {
    method: "GET",
    params: { limit: limit.toString(), offset: offset.toString() },
  });
}

export async function getBriefing(scriptId: string) {
  return callEdgeFunction<{ 
    script: any; 
    latest_job: any; 
  }>("get-briefing", {
    method: "GET",
    params: { script_id: scriptId },
  });
}

export async function createShareLink(scriptId: string, jobId?: string | null, options?: { expires_in_hours?: number, scope?: string, allow_transcript?: boolean, allow_action_cards?: boolean }) {
  return callEdgeFunction<{ share_id: string, token: string, share_url: string }>("create-share-link", {
    body: { script_id: scriptId, job_id: jobId, ...options }
  });
}

export interface ShareLink {
  id: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  scope: string;
  view_count: number;
  last_viewed_at: string | null;
  script_id: string;
  job_id: string | null;
  briefing_scripts: { title: string; segments_count: number } | null;
}

export async function listShareLinks() {
  return callEdgeFunction<{ shares: ShareLink[] }>("list-share-links", { method: "POST" });
}

export async function revokeShareLink(shareId: string) {
  return callEdgeFunction<{ status: string }>("revoke-share-link", {
    body: { share_id: shareId }
  });
}

export async function getSharedBriefing(token: string) {
  return callEdgeFunction<{ share: any, script: any, render: any }>("get-shared-briefing", {
    method: "GET",
    params: { t: token }
  });
}
