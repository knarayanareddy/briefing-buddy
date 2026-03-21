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
    headers["x-internal-api-key"] = internalApiKey;
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
  return callEdgeFunction<{ 
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
  enabled_modules: string[];
  module_settings: Record<string, any>;
  updated_at: string;
}

export async function getProfiles() {
  return callEdgeFunction<BriefingProfile[]>("get-profiles", { method: "GET" });
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
  return callEdgeFunction<PublicModuleDefinition[]>("get-module-catalog", { method: "GET" });
}

export async function addToReadingList(item: { source_id: string; title: string; url: string }) {
  // TODO: create reading_list table to persist items
  console.log("Reading list save (stub):", item);
  return { ok: true };
}

export async function getConnectorStatus() {
  return callEdgeFunction<any>("connector-status", { method: "GET" });
}

export async function updateConnectorConfig(type: string, config: any) {
  return callEdgeFunction<any>("update-connector-config", {
    body: { type, config }
  });
}
