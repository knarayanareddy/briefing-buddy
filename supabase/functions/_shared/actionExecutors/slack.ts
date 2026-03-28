import { ExecutorInput, ExecutorContext, ExecutorResult } from "./types.ts";
import { decryptString } from "../crypto.ts";

/**
 * Posts a message to a Slack channel using the user's stored bot token.
 */
export async function slackPostMessage(
  input: ExecutorInput,
  ctx: ExecutorContext
): Promise<ExecutorResult> {
  const { payload, user_id } = input;

  if (!payload.channel) {
    return { ok: false, error_code: "missing_channel", error_message: "payload.channel is required" };
  }
  if (!payload.text) {
    return { ok: false, error_code: "missing_text", error_message: "payload.text is required" };
  }

  const token = await getSlackToken(ctx, user_id);
  if (!token) {
    return { ok: false, error_code: "slack_not_connected", error_message: "Slack bot token not found. Connect Slack first." };
  }

  try {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: payload.channel,
        text: payload.text,
        thread_ts: payload.thread_ts || undefined,
      }),
    });

    const data = await res.json();

    if (!data.ok) {
      return {
        ok: false,
        error_code: `slack_${data.error}`,
        error_message: `Slack API error: ${data.error}`,
      };
    }

    return {
      ok: true,
      provider_result: {
        channel: data.channel,
        ts: data.ts,
        message_url: `https://slack.com/archives/${data.channel}/p${data.ts?.replace(".", "")}`,
      },
    };
  } catch (e: any) {
    return { ok: false, error_code: "slack_request_failed", error_message: e.message };
  }
}

async function getSlackToken(ctx: ExecutorContext, userId: string): Promise<string | null> {
  try {
    const { data } = await ctx.supabase
      .from("connector_secrets")
      .select("secret_ciphertext, secret_iv")
      .eq("user_id", userId)
      .eq("provider", "slack")
      .single();

    if (!data?.secret_ciphertext) return null;
    return await decryptString(data.secret_ciphertext, data.secret_iv, ctx.connectorSecretKey);
  } catch {
    return null;
  }
}
