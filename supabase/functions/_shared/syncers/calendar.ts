import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { recordSyncAttemptStart, recordSyncSuccess, recordSyncFailure } from "../connectorHealth.ts";
import { getConnectorSecretDecrypted } from "../connectors.ts";

export async function syncCalendarForUser(
  supabase: SupabaseClient,
  { userId, secretKey, runId: existingRunId }: { userId: string; secretKey: string; runId?: string }
) {
  const provider = "google"; // We pivot off the google provider for calendar
  const runId = existingRunId || await recordSyncAttemptStart(supabase, { userId, provider });

  try {
    // 1. Get the encrypted refresh token
    const secrets = await getConnectorSecretDecrypted(supabase, userId, provider);
    if (!secrets || !secrets.refresh_token) throw new Error("google_not_configured: Google is not connected.");

    const refreshToken = secrets.refresh_token;

    // 2. Exchange refresh token for access token
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID") || "YOUR_GOOGLE_CLIENT_ID";
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET") || "YOUR_GOOGLE_CLIENT_SECRET";

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token"
      })
    });

    if (!tokenRes.ok) throw new Error(`Failed to refresh access token: ${await tokenRes.text()}`);
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 3. Query Google Calendar for today's events (next 24 hours)
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    const calUrl = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    calUrl.searchParams.set("timeMin", timeMin);
    calUrl.searchParams.set("timeMax", timeMax);
    calUrl.searchParams.set("singleEvents", "true");
    calUrl.searchParams.set("orderBy", "startTime");
    calUrl.searchParams.set("maxResults", "50");

    const calRes = await fetch(calUrl.toString(), {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });

    if (!calRes.ok) throw new Error(`Calendar fetch failed: ${await calRes.text()}`);
    const calData = await calRes.json();
    const events = calData.items || [];

    // 4. Transform and Upsert into synced_items
    const upserts = events.map((ev: any) => {
      const startIso = ev.start?.dateTime || ev.start?.date;
      const endIso = ev.end?.dateTime || ev.end?.date;
      
      return {
        user_id: userId,
        provider: "google",
        item_type: "calendar_event",
        source_id: `gcal-${ev.id}`,
        title: ev.summary || "Untitled Event",
        url: ev.htmlLink,
        author: ev.organizer?.email || "Unknown",
        occurred_at: startIso || new Date().toISOString(),
        payload: {
          start_time: startIso,
          end_time: endIso,
          description: ev.description,
          location: ev.location,
          attendees: (ev.attendees || []).map((a: any) => a.email),
          hangout_link: ev.hangoutLink
        }
      };
    });

    let itemsSynced = 0;
    if (upserts.length > 0) {
      const { error: upsertErr } = await supabase.from("synced_items").upsert(upserts, { onConflict: "user_id, provider, item_type, external_id" }).catch(() => supabase.from("synced_items").upsert(upserts, { onConflict: "source_id" }));
      if (upsertErr) throw upsertErr;
      itemsSynced = upserts.length;
    }

    await recordSyncSuccess(supabase, {
      runId,
      userId,
      provider,
      itemsFound: upserts.length,
      itemsUpserted: itemsSynced
    });

    return { ok: true, items_synced: itemsSynced };

  } catch (e: any) {
    console.error("syncCalendarForUser error:", e.message);
    
    await recordSyncFailure(supabase, {
      runId,
      userId,
      provider,
      errorCode: e.message.includes("google_not_configured") ? "google_not_configured" : "calendar_sync_error",
      errorMessage: e.message
    });

    throw e;
  }
}
