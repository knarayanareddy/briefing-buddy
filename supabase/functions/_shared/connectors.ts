import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { stableSourceId } from "./stableId.ts";

export interface SyncedItem {
  user_id: string;
  provider: string;
  item_type: string;
  external_id: string;
  source_id: string;
  occurred_at: string;
  title?: string;
  author?: string;
  url?: string;
  summary?: string;
  payload: any;
}

/**
 * Gets the configuration for a specific provider.
 */
export async function getConnectorConfig(supabase: SupabaseClient, userId: string, provider: string) {
  const { data, error } = await supabase
    .from("connector_configs")
    .select("config")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  if (error) throw error;
  return data?.config || null;
}

/**
 * Gets a decrypted secret from the vault.
 * Requires the set-connector-secret logic to have been run.
 */
export async function getConnectorSecretDecrypted(supabase: SupabaseClient, userId: string, provider: string): Promise<any> {
  const { data, error } = await supabase
    .from("connector_secrets")
    .select("secret_value")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  // Note: Decryption happens in the Edge Function context if the DB uses pgsodium,
  // or on-the-fly if we use a master key. Based on existing code, we assume 
  // service role access to the decrypted view or a decryption helper.
  return data.secret_value;
}

/**
 * Normalized upsert into synced_items with automatic stable ID check.
 */
export async function upsertSyncedItems(supabase: SupabaseClient, items: Partial<SyncedItem>[]) {
  if (items.length === 0) return { count: 0 };

  // Ensure all items have source_id
  for (const item of items) {
    if (!item.source_id && item.item_type && item.external_id) {
      item.source_id = await stableSourceId(item.item_type, item.external_id);
    }
  }

  const { data, error } = await supabase
    .from("synced_items")
    .upsert(items, { onConflict: "user_id, provider, item_type, external_id" })
    .select("id");

  if (error) throw error;
  return { count: data?.length || 0 };
}

/**
 * Standardized status builder for the dashboard.
 */
export async function getConnectorStatusSummary(supabase: SupabaseClient, userId: string) {
  const { data: health, error: healthErr } = await supabase
    .from("connector_health")
    .select("*")
    .eq("user_id", userId);

  if (healthErr) throw healthErr;

  // Get latest run for each provider
  const { data: runs, error: runErr } = await supabase
    .from("connector_sync_runs")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false });

  if (runErr) throw runErr;

  // Group runs by provider and pick the first (latest)
  const latestRuns = new Map<string, any>();
  runs?.forEach((run: any) => {
    if (!latestRuns.has(run.provider)) {
      latestRuns.set(run.provider, run);
    }
  });

  return health.map((h: any) => ({
    ...h,
    last_run: latestRuns.get(h.provider) || null
  }));
}
