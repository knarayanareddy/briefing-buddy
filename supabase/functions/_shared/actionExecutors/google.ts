import { ExecutorInput, ExecutorResult, ExecutorContext } from "./types.ts";

/**
 * Refreshes a Google access token from the stored refresh token.
 */
async function getGoogleAccessToken(ctx: ExecutorContext, userId: string): Promise<string | null> {
  const { data } = await ctx.supabase
    .from("connector_secrets")
    .select("secret_value")
    .eq("user_id", userId)
    .eq("provider", "google")
    .maybeSingle();

  if (!data?.secret_value) return null;

  const secrets = typeof data.secret_value === "string" ? JSON.parse(data.secret_value) : data.secret_value;
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
    await tokenRes.text(); // consume body
    return null;
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token || null;
}

/**
 * Google Calendar: create event executor.
 * payload: { summary: string, start: string (ISO), end: string (ISO), description?: string, location?: string }
 */
export async function googleCalendarCreateEvent(input: ExecutorInput, ctx: ExecutorContext): Promise<ExecutorResult> {
  const { summary, start, end, description, location } = input.payload as {
    summary?: string; start?: string; end?: string; description?: string; location?: string;
  };

  if (!summary || !start || !end) {
    return { ok: false, provider_result: {}, error_code: "invalid_payload", error_message: "summary, start, and end are required" };
  }

  const accessToken = await getGoogleAccessToken(ctx, input.user_id);
  if (!accessToken) {
    return { ok: false, provider_result: {}, error_code: "google_not_connected", error_message: "Google not connected or missing refresh token." };
  }

  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary,
      description: description || "",
      location: location || "",
      start: { dateTime: start },
      end: { dateTime: end },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    return {
      ok: false,
      provider_result: { status: res.status },
      error_code: `google_calendar_${res.status}`,
      error_message: data.error?.message || "Calendar API error",
    };
  }

  return {
    ok: true,
    provider_result: {
      event_id: data.id,
      html_link: data.htmlLink,
      status: data.status,
    },
  };
}

/**
 * Gmail: create draft executor.
 * payload: { to: string, subject: string, body: string, in_reply_to?: string (message ID) }
 */
export async function gmailCreateDraft(input: ExecutorInput, ctx: ExecutorContext): Promise<ExecutorResult> {
  const { to, subject, body: emailBody, in_reply_to } = input.payload as {
    to?: string; subject?: string; body?: string; in_reply_to?: string;
  };

  if (!to || !subject || !emailBody) {
    return { ok: false, provider_result: {}, error_code: "invalid_payload", error_message: "to, subject, and body are required" };
  }

  const accessToken = await getGoogleAccessToken(ctx, input.user_id);
  if (!accessToken) {
    return { ok: false, provider_result: {}, error_code: "google_not_connected", error_message: "Google not connected or missing refresh token." };
  }

  // Build RFC 2822 message
  const headers = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset="UTF-8"`,
  ];
  if (in_reply_to) {
    headers.push(`In-Reply-To: ${in_reply_to}`);
    headers.push(`References: ${in_reply_to}`);
  }
  const rawMessage = headers.join("\r\n") + "\r\n\r\n" + emailBody;
  const encodedMessage = btoa(unescape(encodeURIComponent(rawMessage)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await fetch("https://www.googleapis.com/gmail/v1/users/me/drafts", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: { raw: encodedMessage },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    return {
      ok: false,
      provider_result: { status: res.status },
      error_code: `gmail_${res.status}`,
      error_message: data.error?.message || "Gmail API error",
    };
  }

  return {
    ok: true,
    provider_result: {
      draft_id: data.id,
      message_id: data.message?.id,
    },
  };
}
