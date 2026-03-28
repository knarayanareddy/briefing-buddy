import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { stableSourceId } from "../stableId.ts";
import { sanitizeDeep } from "../sanitize.ts";
import { recordSyncAttemptStart, recordSyncSuccess, recordSyncFailure } from "../connectorHealth.ts";

/**
 * Refreshes a Google access token from connector_secrets.
 */
async function getGoogleAccessToken(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("connector_secrets")
    .select("secret_value")
    .eq("user_id", userId)
    .eq("provider", "google")
    .maybeSingle();

  if (!data?.secret_value) return null;

  const secrets = typeof data.secret_value === "string"
    ? JSON.parse(data.secret_value)
    : data.secret_value;
  const refreshToken = secrets?.refresh_token;
  if (!refreshToken) return null;

  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error("Google token refresh failed:", errText.slice(0, 200));
    return null;
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token || null;
}

export async function syncGmailForUser(
  supabase: SupabaseClient,
  { userId, runId: existingRunId }: { userId: string; runId?: string }
) {
  const provider = "google";
  const runId = existingRunId || await recordSyncAttemptStart(supabase, { userId, provider });

  try {
    // 1. Get access token
    const accessToken = await getGoogleAccessToken(supabase, userId);
    if (!accessToken) {
      throw new Error("google_not_configured: Google is not connected or refresh token missing.");
    }

    // 2. Fetch recent messages (last 24h, max 25)
    const after = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
    const query = `newer_than:1d is:inbox`;
    const listUrl = new URL("https://www.googleapis.com/gmail/v1/users/me/messages");
    listUrl.searchParams.set("q", query);
    listUrl.searchParams.set("maxResults", "25");

    const listRes = await fetch(listUrl.toString(), {
      headers: { "Authorization": `Bearer ${accessToken}` },
    });

    if (!listRes.ok) {
      const errText = await listRes.text();
      if (listRes.status === 401) throw new Error("google_401: Gmail access token expired or revoked.");
      throw new Error(`Gmail list failed (${listRes.status}): ${errText.slice(0, 200)}`);
    }

    const listData = await listRes.json();
    const messageIds: string[] = (listData.messages || []).map((m: any) => m.id);

    if (messageIds.length === 0) {
      await recordSyncSuccess(supabase, {
        runId, userId, provider,
        itemsFound: 0, itemsUpserted: 0,
        meta: { message: "No recent messages" },
      });
      return { ok: true, items_synced: 0 };
    }

    // 3. Fetch message metadata (NOT full body for privacy/size)
    const syncedItems = [];
    for (const msgId of messageIds) {
      try {
        const msgRes = await fetch(
          `https://www.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
          { headers: { "Authorization": `Bearer ${accessToken}` } }
        );

        if (!msgRes.ok) {
          await msgRes.text(); // consume
          continue;
        }

        const msg = await msgRes.json();
        const headers = msg.payload?.headers || [];
        const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

        const subject = getHeader("Subject") || "(No Subject)";
        const from = getHeader("From");
        const dateStr = getHeader("Date");
        const occurredAt = dateStr ? new Date(dateStr).toISOString() : new Date(parseInt(msg.internalDate)).toISOString();
        const snippet = sanitizeDeep(msg.snippet || "", 300);

        const externalId = msg.id;
        const stableId = await stableSourceId("email", externalId);

        syncedItems.push({
          user_id: userId,
          provider: "google",
          item_type: "email",
          external_id: externalId,
          source_id: stableId,
          occurred_at: occurredAt,
          title: subject,
          author: from,
          url: `https://mail.google.com/mail/u/0/#inbox/${msg.threadId}`,
          summary: snippet,
          payload: sanitizeDeep({
            thread_id: msg.threadId,
            label_ids: msg.labelIds,
            is_unread: (msg.labelIds || []).includes("UNREAD"),
          }),
        });
      } catch (msgErr: any) {
        console.warn(`Gmail message fetch error for ${msgId}:`, msgErr.message);
      }
    }

    // 4. Upsert
    if (syncedItems.length > 0) {
      const { error: upsertErr } = await supabase
        .from("synced_items")
        .upsert(syncedItems, { onConflict: "user_id, provider, item_type, external_id" });
      if (upsertErr) throw upsertErr;
    }

    // 5. Record success
    await recordSyncSuccess(supabase, {
      runId, userId, provider,
      itemsFound: messageIds.length,
      itemsUpserted: syncedItems.length,
      meta: { total_messages: messageIds.length },
    });

    return { ok: true, items_synced: syncedItems.length };

  } catch (e: any) {
    console.error("syncGmailForUser error:", e.message);
    await recordSyncFailure(supabase, {
      runId, userId, provider,
      errorCode: e.message.includes("google_not_configured") ? "google_not_configured"
        : e.message.includes("google_401") ? "google_401"
        : "gmail_sync_error",
      errorMessage: e.message,
    });
    throw e;
  }
}
