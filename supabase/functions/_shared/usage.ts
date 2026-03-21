import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Checks and increments the daily usage limit for a user.
 * Returns true if the limit is exceeded.
 */
export async function checkLimitExceeded(
  supabase: SupabaseClient,
  userId: string,
  type: "generate" | "render",
  limit: number
): Promise<{ exceeded: boolean; current: number }> {
  const day = new Date().toISOString().split("T")[0];

  // Atomic upsert with increment logic (Postgres function could be better, 
  // but for hackathon we use SELECT then UPSERT with optimistic assumption or just service-role bypass)
  const { data, error } = await supabase
    .from("briefing_usage_limits")
    .select("generate_count, render_count")
    .eq("user_id", userId)
    .eq("day", day)
    .single();

  if (error && error.code !== "PGRST116") {
    // Some other error
    console.error(`Usage check error for user ${userId}:`, error.message);
    return { exceeded: false, current: 0 }; // Fail open for safety or closed for cost? Let's fail open.
  }

  const currentCount = data ? (type === "generate" ? data.generate_count : data.render_count) : 0;

  if (currentCount >= limit) {
    return { exceeded: true, current: currentCount };
  }

  // Increment
  const update = type === "generate" 
    ? { generate_count: currentCount + 1 } 
    : { render_count: currentCount + 1 };

  await supabase
    .from("briefing_usage_limits")
    .upsert({ user_id: userId, day, ...update }, { onConflict: "user_id, day" });

  return { exceeded: false, current: currentCount + 1 };
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
