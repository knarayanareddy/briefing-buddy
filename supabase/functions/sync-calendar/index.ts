import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { config, validateConfig } from "../_shared/config.ts";
import { authorizeRequest } from "../_shared/auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSecret, recordSyncAttempt } from "../_shared/connectors.ts";
import { decryptString } from "../_shared/crypto.ts";

validateConfig();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-api-key, x-user-id, x-preview-user-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await authorizeRequest(req, config);
  if (!auth.ok) {
    return new Response(JSON.stringify(auth.body), { status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const userId = auth.user_id!;
  const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);
  const startTime = Date.now();

  try {
    const { provider = "google" } = await req.json().catch(() => ({}));

    // 1. Get the encrypted refresh token
    const encryptedRecord = await getSecret(supabase, userId, provider);
    if (!encryptedRecord) throw new Error("Google is not connected (no refresh token found).");

    const refreshToken = await decryptString(
      encryptedRecord.secret_ciphertext,
      encryptedRecord.secret_iv,
      config.CONNECTOR_SECRET_KEY as string
    );

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
    
    // We request singleEvents=true to expand recurring events, and orderBy=startTime
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
      const { error: upsertErr } = await supabase.from("synced_items").upsert(upserts, { onConflict: "source_id" });
      if (upsertErr) throw upsertErr;
      itemsSynced = upserts.length;
    }

    // 5. Success Tracking
    await recordSyncAttempt(supabase, userId, provider, "success", Date.now() - startTime, itemsSynced);

    return new Response(JSON.stringify({ ok: true, items_synced: itemsSynced }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e: any) {
    console.error(`sync-calendar error for ${userId}:`, e.message);
    await recordSyncAttempt(supabase, userId, "google", "error", Date.now() - startTime, 0, e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
