import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { stableSourceId } from "../stableId.ts";
import { sanitizeDeep } from "../sanitize.ts";
import { decryptString } from "../crypto.ts";
import { recordSyncAttemptStart, recordSyncSuccess, recordSyncFailure } from "../connectorHealth.ts";

export async function syncSlackForUser(
  supabase: SupabaseClient,
  { userId, secretKey, runId: existingRunId }: { userId: string; secretKey: string; runId?: string }
) {
  const provider = "slack";
  const runId = existingRunId || await recordSyncAttemptStart(supabase, { userId, provider });

  try {
    // 1. Get Slack Secrets
    const { data: connSecret, error: connErr } = await supabase
      .from("connector_secrets")
      .select("secret_ciphertext, secret_iv")
      .eq("user_id", userId)
      .eq("provider", "slack")
      .single();

    if (connErr || !connSecret?.secret_ciphertext) {
      throw new Error("slack_not_configured: Slack token not found.");
    }

    const token = await decryptString(connSecret.secret_ciphertext, connSecret.secret_iv, secretKey);

    // 2. Get Slack Config
    const { data: configRow } = await supabase
      .from("connector_configs")
      .select("config")
      .eq("user_id", userId)
      .eq("provider", "slack")
      .single();

    const config = configRow?.config || {};
    const channels = config.channels ? config.channels.split(",").map((s: string) => s.trim().replace(/^#/, "")) : [];
    const mentionsOnly = !!config.mentions_only;

    // 3. For each channel, fetch history
    // Note: In a production app, we would use slack-web-api package, 
    // but for Edge Functions we'll use direct fetch for simplicity.
    
    let totalSynced = 0;
    const syncedItems = [];

    // If no channels specified, we might want to fetch joined channels 
    // but let's stick to explicit config as requested by user.
    if (channels.length === 0) {
        throw new Error("slack_no_channels: No channels configured for sync.");
    }

    // Map channel names to IDs (simplified: assuming valid channel IDs or names for now)
    // In a real app, we'd call conversations.list first.
    
    for (const channelName of channels) {
      // Fetch channel history
      // We'll use a mocked search or history call depending on what 'channelName' is.
      const slackRes = await fetch(`https://slack.com/api/conversations.history?channel=${channelName}&limit=50`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const slackData = await slackRes.json();
      if (!slackData.ok) {
          console.warn(`Slack API error for ${channelName}: ${slackData.error}`);
          continue;
      }

      for (const msg of (slackData.messages || [])) {
        if (msg.type !== "message" || msg.subtype) continue;
        
        // Mentions filter logic (very simplified)
        if (mentionsOnly && !msg.text?.includes("<@")) continue; 

        const externalId = `${channelName}-${msg.ts}`;
        const stableId = await stableSourceId("slack_msg", externalId);

        syncedItems.push({
          user_id: userId,
          provider: "slack",
          item_type: "slack_message",
          external_id: externalId,
          source_id: stableId,
          occurred_at: new Date(parseFloat(msg.ts) * 1000).toISOString(),
          title: `Message in #${channelName}`,
          author: msg.user,
          url: `https://slack.com/archives/${channelName}/p${msg.ts.replace(".", "")}`,
          summary: sanitizeDeep(msg.text?.slice(0, 500) || "Empty message"),
          payload: sanitizeDeep({
            channel: channelName,
            ts: msg.ts,
            user_id: msg.user,
            thread_ts: msg.thread_ts
          }),
        });
      }
    }

    // 4. Batched Upsert
    if (syncedItems.length > 0) {
      const { error: upsertErr } = await supabase
        .from("synced_items")
        .upsert(syncedItems, { onConflict: "user_id, provider, item_type, external_id" });
      
      if (upsertErr) throw upsertErr;
      totalSynced = syncedItems.length;
    }

    // 5. Record Success
    await recordSyncSuccess(supabase, {
      runId,
      userId,
      provider,
      itemsFound: syncedItems.length,
      itemsUpserted: totalSynced,
      meta: { channel_count: channels.length }
    });

    return { ok: true, items_synced: totalSynced };

  } catch (e: any) {
    console.error("syncSlackForUser error:", e.message);

    await recordSyncFailure(supabase, {
      runId,
      userId,
      provider,
      errorCode: "slack_sync_error",
      errorMessage: e.message
    });

    throw e;
  }
}
