import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface ConnectorHealth {
  user_id: string;
  provider: string;
  status: 'active' | 'missing' | 'error' | 'revoked';
  connected: boolean;
  last_attempt_at: string | null;
  last_success_at: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  consecutive_failures: number;
  next_retry_at: string | null;
  cooldown_until: string | null;
  items_synced_last_run: number;
}

/**
 * Ensures a health record exists for the provider, typically called on secret set.
 */
export async function initOrUpsertHealthOnConnect(
  supabase: SupabaseClient, 
  { userId, provider, connected = true, status = 'active' }: { userId: string; provider: string; connected?: boolean; status?: 'active' | 'missing' | 'error' | 'revoked' }
) {
  const { error } = await supabase
    .from('connector_health')
    .upsert({
      user_id: userId,
      provider,
      connected,
      status,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id, provider' });
  
  if (error) throw error;
}

/**
 * Records the start of a sync attempt.
 */
export async function recordSyncAttemptStart(
  supabase: SupabaseClient,
  { userId, provider }: { userId: string; provider: string }
) {
  // 1. Create run log
  const { data: run, error: runErr } = await supabase
    .from('connector_sync_runs')
    .insert({
      user_id: userId,
      provider,
      status: 'running'
    })
    .select('id')
    .single();

  if (runErr) throw runErr;

  // 2. Update health table's last_attempt_at
  const { error: healthErr } = await supabase
    .from('connector_health')
    .update({ 
      last_attempt_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('provider', provider);

  if (healthErr) {
    // Silently log or ignore if row doesn't exist yet (though it should)
    console.warn(`Could not update last_attempt_at for ${provider}: ${healthErr.message}`);
  }

  return run.id;
}

/**
 * Records a successful sync run.
 */
export async function recordSyncSuccess(
  supabase: SupabaseClient,
  { runId, userId, provider, itemsFound, itemsUpserted, meta = {} }: { runId: string; userId: string; provider: string; itemsFound: number; itemsUpserted: number; meta?: any }
) {
  const now = new Date().toISOString();

  // 1. Update run log
  await supabase
    .from('connector_sync_runs')
    .update({
      finished_at: now,
      outcome: 'success',
      items_found: itemsFound,
      items_upserted: itemsUpserted,
      meta
    })
    .eq('id', runId);

  // 2. Update health
  await supabase
    .from('connector_health')
    .update({
      status: 'active',
      connected: true,
      last_success_at: now,
      consecutive_failures: 0,
      next_retry_at: null,
      last_error_code: null,
      last_error_message: null,
      items_synced_last_run: itemsUpserted,
      updated_at: now
    })
    .eq('user_id', userId)
    .eq('provider', provider);
}

/**
 * Records a failed sync run and computes backoff.
 */
export async function recordSyncFailure(
  supabase: SupabaseClient,
  { runId, userId, provider, errorCode, errorMessage, meta = {} }: { runId: string; userId: string; provider: string; errorCode: string; errorMessage: string; meta?: any }
) {
  const now = new Date().toISOString();
  const sanitizedMsg = sanitizeErrorMessage(errorMessage);

  // 1. Fetch current consecutive failures to compute next retry
  const { data: health } = await supabase
    .from('connector_health')
    .select('consecutive_failures')
    .eq('user_id', userId)
    .eq('provider', provider)
    .single();

  const newConsecutiveFailures = (health?.consecutive_failures || 0) + 1;
  const nextRetryAt = computeNextRetry(newConsecutiveFailures);

  // 2. Update run log
  await supabase
    .from('connector_sync_runs')
    .update({
      finished_at: now,
      outcome: 'failed',
      error_code: errorCode,
      error_message: sanitizedMsg,
      meta
    })
    .eq('id', runId);

  // 3. Update health
  await supabase
    .from('connector_health')
    .update({
      status: 'error',
      consecutive_failures: newConsecutiveFailures,
      last_error_code: errorCode,
      last_error_message: sanitizedMsg,
      next_retry_at: nextRetryAt.toISOString(),
      updated_at: now
    })
    .eq('user_id', userId)
    .eq('provider', provider);
}

/**
 * Helper to record a skipped run (e.g., due to cooldown).
 */
export async function recordSyncSkip(
  supabase: SupabaseClient,
  { runId, reason, meta = {} }: { runId: string; reason: string; meta?: any }
) {
  await supabase
    .from('connector_sync_runs')
    .update({
      finished_at: new Date().toISOString(),
      outcome: 'skipped',
      error_code: 'sync_skipped',
      error_message: reason,
      meta
    })
    .eq('id', runId);
}

/**
 * Computes exponential backoff: base * 2^failures, capped at 1 hour.
 */
export function computeNextRetry(consecutiveFailures: number): Date {
  const MIN_MS = 60 * 1000; // 1 minute
  const MAX_MS = 60 * 60 * 1000; // 1 hour
  
  const backoffMs = Math.min(MIN_MS * Math.pow(2, consecutiveFailures - 1), MAX_MS);
  return new Date(Date.now() + backoffMs);
}

/**
 * Checks if a sync should be skipped based on current health state.
 */
export async function shouldSkipSyncNow(
  supabase: SupabaseClient,
  { userId, provider }: { userId: string; provider: string }
): Promise<{ skip: boolean; reason?: string }> {
  const { data: health, error } = await supabase
    .from('connector_health')
    .select('next_retry_at, cooldown_until, status')
    .eq('user_id', userId)
    .eq('provider', provider)
    .single();

  if (error || !health) return { skip: false };

  const now = new Date();

  if (health.cooldown_until && new Date(health.cooldown_until) > now) {
    return { skip: true, reason: `In cooldown until ${health.cooldown_until}` };
  }

  if (health.next_retry_at && new Date(health.next_retry_at) > now) {
    return { skip: true, reason: `Backoff active until ${health.next_retry_at}` };
  }

  return { skip: false };
}

/**
 * Truncates and redacts common sensitive patterns from error messages.
 */
function sanitizeErrorMessage(msg: string): string {
  if (!msg) return "";
  const truncated = msg.length > 300 ? msg.substring(0, 297) + "..." : msg;
  // Simple redact for things that look like keys or tokens (basic hex/base64 strings > 20 chars)
  return truncated.replace(/[a-zA-Z0-9\-_]{20,}/g, "[REDACTED]");
}
