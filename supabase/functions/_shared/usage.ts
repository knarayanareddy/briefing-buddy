import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Atomically checks AND increments the daily usage limit for a user.
 * Delegates to the consume_daily_usage Postgres function (migration
 * 20261103130000), which serializes concurrent callers with a row lock.
 *
 * Failure policy: FAIL CLOSED. If the usage check cannot run, we deny the
 * request (`error` set) rather than letting unlimited LLM/render spend
 * through — callers should surface this as 503, not as a 429 limit message.
 */
export async function checkLimitExceeded(
  supabase: SupabaseClient,
  userId: string,
  type: "generate" | "render",
  limit: number
): Promise<{ exceeded: boolean; current: number; error?: string }> {
  try {
    const { data, error } = await supabase.rpc("consume_daily_usage", {
      p_user_id: userId,
      p_type: type,
      p_limit: limit,
    });

    if (error) {
      console.error(`Usage check failed for user ${userId}:`, error.message);
      return { exceeded: true, current: limit, error: error.message };
    }

    return {
      exceeded: Boolean(data?.exceeded),
      current: Number(data?.current ?? 0),
    };
  } catch (e: any) {
    console.error(`Usage check threw for user ${userId}:`, e?.message);
    return { exceeded: true, current: limit, error: e?.message ?? "usage check failed" };
  }
}

/**
 * Logs an audit event to the database.
 */
export async function logAudit(
  supabase: SupabaseClient,
  userId: string | null,
  eventType: string,
  metadata: Record<string, any> = {}
): Promise<void> {
  try {
    const { error } = await supabase
      .from("audit_events")
      .insert({
        user_id: userId,
        event_type: eventType,
        metadata
      });

    if (error) console.error(`Audit logging failed for ${eventType}:`, error.message);
  } catch (err: any) {
    console.error(`Audit error for ${eventType}:`, err.message);
  }
}
