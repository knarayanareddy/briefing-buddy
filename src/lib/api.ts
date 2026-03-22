import { supabase } from "@/integrations/supabase/client";

// --- Configuration & Base Request Logic ---

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;
const FUNCTIONS_BASE = `${SUPABASE_URL}/functions/v1`;

let internalApiKey = "";
export const setInternalApiKey = (key: string) => { internalApiKey = key; };
export const getInternalApiKey = () => internalApiKey;

/**
 * Universal caller for Supabase Edge Functions.
 * Handles Auth, Headers, and Error normalization.
 */
async function callEdgeFunction<T>(
  fnName: string,
  options: { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown; params?: Record<string, string> } = {}
): Promise<T> {
  const { method = "POST", body, params } = options;
  const url = new URL(`${FUNCTIONS_BASE}/${fnName}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  const demoAuthMode = import.meta.env.VITE_DEMO_AUTH_MODE || "internal_key";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };

  if (session) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  } else if (demoAuthMode === "internal_key") {
    headers["x-internal-api-key"] = internalApiKey || "hackathon_unlocked_preview_2024";
    headers["x-preview-user-id"] = import.meta.env.VITE_DEMO_USER_ID || "00000000-0000-0000-0000-000000000000";
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let errorMsg = `Edge function ${fnName} failed (${res.status})`;
    try {
      const errorJson = await res.json();
      errorMsg = errorJson.error || errorJson.message || errorMsg;
    } catch {
      const text = await res.text();
      if (text) errorMsg = text;
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

// --- Domain Interfaces ---

export interface SegmentStatus {
  segment_id: number;
  avatar_video_url: string | null;
  b_roll_image_url: string | null;
  ui_action_card: any;
  dialogue: string;
  grounding_source_id: string;
  status: "queued" | "rendering" | "complete" | "failed";
  error: string | null;
}

export interface JobStatusResponse {
  status: "pending" | "rendering" | "complete" | "failed";
  progress?: {
    total: number;
    queued: number;
    rendering: number;
    complete: number;
    failed: number;
    percent_complete: number;
  };
  segments: SegmentStatus[];
  error_message?: string;
}

export interface BriefingProfile {
  id: string;
  name: string;
  persona: string | null;
  timezone: string | null;
  frequency: "manual" | "daily" | "twice_daily" | "hourly";
  enabled_modules: string[];
  module_settings: Record<string, any>;
  updated_at: string;
}

export interface HistoryItem {
  id: string;
  created_at: string;
  persona: string;
  profile_id: string | null;
  profile_name: string | null;
  trigger: "manual" | "scheduled";
  scheduled_for: string | null;
  title: string | null;
  segments_count: number;
  render_job: {
    id: string;
    status: string;
    updated_at: string;
    error: string | null;
  } | null;
  archived: boolean;
}

export interface UserSettings {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  timezone: string;
  location_text: string | null;
  location_lat: number | null;
  location_lon: number | null;
  notification_prefs: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

// --- Briefing Core Actions ---

/**
 * Rewritten GenerateScript signature per requirements.
 */
export async function generateScript(payload: {
  profile_id?: string
  user_preferences?: any
  user_data?: any
  trigger?: 'manual' | 'scheduled'
  scheduled_for?: string
  title?: string
}): Promise<{ script_id: string; script_json: any; cached?: boolean }> {
  return callEdgeFunction<{ script_id: string; script_json: any; cached?: boolean }>("generate-script", {
    body: payload,
  });
}

export async function previewPlan(profileId: string) {
  return await callEdgeFunction<{ 
    profile_id: string; 
    plan_summary: any;
    connector_status: Array<{ provider: string; status: string }>;
  }>("preview-plan", {
    body: { profile_id: profileId },
  });
}

export async function startRender(scriptId: string) {
  return callEdgeFunction<{ job_id: string }>("start-render", {
    body: { script_id: scriptId },
  });
}

export async function getJobStatus(jobId: string) {
  return callEdgeFunction<JobStatusResponse>("job-status", {
    method: "GET",
    params: { job_id: jobId },
  });
}

export async function assembleUserData(profileId?: string) {
  return callEdgeFunction<{ user_data: any; meta: any }>("assemble-user-data", {
    body: profileId ? { profile_id: profileId } : {},
  });
}

// --- Profile & Module Management ---

export async function getProfiles() {
  return await callEdgeFunction<BriefingProfile[]>("get-profiles", { method: "GET" });
}

export async function upsertProfile(profile: Partial<BriefingProfile>) {
  return callEdgeFunction<BriefingProfile>("upsert-profile", { body: profile });
}

export async function deleteProfile(id: string) {
  return callEdgeFunction<{ success: boolean }>("delete-profile", { body: { id } });
}

export async function getModuleCatalog() {
  return await callEdgeFunction<any[]>("get-module-catalog", { method: "GET" });
}

// --- Reading List ---

export async function addToReadingList(item: { source_id: string; title: string; url: string }) {
  return await callEdgeFunction<any>("manage-reading-list", {
    body: { action: "add", item }
  });
}

export async function removeFromReadingList(sourceId: string) {
  return await callEdgeFunction<any>("manage-reading-list", {
    body: { action: "delete", item: { source_id: sourceId } }
  });
}

export async function getReadingList() {
  return await callEdgeFunction<any[]>("manage-reading-list", { method: "GET" });
}

// --- Connectors, Sync & Test ---

export async function getConnectorStatus() {
  return callEdgeFunction<any[]>("connector-status", { method: "GET" });
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

export async function updateConnectorConfig(provider: string, config: any) {
  return callEdgeFunction<any>("update-connector-config", {
    body: { type: provider, config }
  });
}

export async function setConnectorSecret(provider: string, secret_payload: any) {
  return callEdgeFunction<any>("set-connector-secret", {
    body: { provider, secret_payload }
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
    body: { redirect_url }
  });
}

export async function completeGoogleOAuth(code: string, state: string) {
  return callEdgeFunction<any>("google-oauth-complete", {
    body: { code, state }
  });
}

// --- History & Retrieval ---

export async function listHistory(limit = 50, offset = 0, includeArchived = false) {
  return callEdgeFunction<{ items: HistoryItem[]; limit: number; offset: number }>("list-history", {
    method: "GET",
    params: { limit: limit.toString(), offset: offset.toString(), include_archived: includeArchived.toString() },
  });
}

export async function getBriefing(scriptId: string) {
  return callEdgeFunction<{ script: any; latest_job: any }>("get-briefing", {
    method: "GET",
    params: { script_id: scriptId },
  });
}

export async function getBriefingSources(scriptId: string) {
  return callEdgeFunction<any>("get-briefing-sources", {
    method: "GET",
    params: { script_id: scriptId },
  });
}

export async function getBriefingArtifacts(scriptId: string) {
  return callEdgeFunction<any>("get-briefing-artifacts", {
    method: "GET",
    params: { script_id: scriptId },
  });
}

export async function archiveBriefing(scriptId: string) {
  return callEdgeFunction<{ success: boolean }>("archive-briefing", {
    body: { script_id: scriptId },
  });
}

// --- Sharing ---

export async function createShareLink(scriptId: string, jobId?: string | null, options?: any) {
  return callEdgeFunction<{ share_id: string, token: string, share_url: string }>("create-share-link", {
    body: { script_id: scriptId, job_id: jobId, ...options }
  });
}

export async function revokeShareLink(shareId: string) {
  return callEdgeFunction<{ status: string }>("revoke-share-link", {
    body: { share_id: shareId }
  });
}

export async function getSharedBriefing(token: string) {
  return callEdgeFunction<any>("get-shared-briefing", {
    method: "GET",
    params: { t: token }
  });
}

// --- Settings, Stats & Health ---

export async function getUserSettings() {
  return callEdgeFunction<UserSettings>("get-user-settings", { method: "GET" });
}

export async function updateUserSettings(payload: Partial<UserSettings>) {
  return callEdgeFunction<UserSettings>("update-user-settings", {
    body: payload,
  });
}

export async function listAuditEvents() {
  return callEdgeFunction<{ events: any[] }>("list-audit-events", { method: "GET" });
}

export async function getUsageStats() {
  return callEdgeFunction<any>("get-usage-stats", { method: "GET" });
}

export async function getSystemKeyStatus() {
  return callEdgeFunction<Record<string, boolean>>("system-key-status", { method: "GET" });
}

export async function getConnectorCredentialStatus() {
  return callEdgeFunction<Record<string, boolean>>("connector-credential-status", { method: "GET" });
}

export async function listSessions() {
  return callEdgeFunction<{ sessions: any[] }>("list-sessions", { method: "GET" });
}

export async function touchSession(sessionData: any) {
  return callEdgeFunction<{ ok: boolean }>("touch-session", {
    body: sessionData,
  });
}

// --- Integration Lab & Preflight ---

export const systemPreflight = async () => {
  return await callEdgeFunction<any>("system-preflight", { method: "GET" });
};

export const connectorPreflight = async () => {
  return await callEdgeFunction<any>("connector-preflight", { method: "GET" });
};

export const seedDummyIntel = async (payload: { 
  include: { rss?: boolean, github?: boolean, slack?: boolean, google?: boolean },
  mark_connected?: boolean 
}) => {
  return await callEdgeFunction<any>("seed-dummy-intel", { body: payload });
};

export const testRssSync = async (url: string) => {
  return await callEdgeFunction<any>("test-rss", { body: { url } });
};

export const testGitHubSync = async (pat: string) => {
  return await callEdgeFunction<any>("test-github", { 
    body: { p_a_t: pat },
  });
};

export const testSlackSync = async (token: string) => {
  return await callEdgeFunction<any>("test-slack", { body: { token } });
};
