import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { recordSyncAttemptStart, recordSyncSuccess, recordSyncFailure } from "../connectorHealth.ts";

export async function syncGmailForUser(
  supabase: SupabaseClient,
  { userId, runId: existingRunId }: { userId: string; runId?: string }
) {
  const provider = "google";
  const runId = existingRunId || await recordSyncAttemptStart(supabase, { userId, provider });

  try {
    // STUB: Gmail sync requires OAuth which is slated for v1.1
    
    await recordSyncSuccess(supabase, {
      runId,
      userId,
      provider,
      itemsFound: 0,
      itemsUpserted: 0,
      meta: { message: "Gmail sync is currently a stub" }
    });

    return { ok: true, items_synced: 0, message: "Gmail sync stubbed." };

  } catch (e: any) {
    console.error("syncGmailForUser error:", e.message);
    
    await recordSyncFailure(supabase, {
      runId,
      userId,
      provider,
      errorCode: "gmail_stub_error",
      errorMessage: e.message
    });

    throw e;
  }
}
