import { ExecutorInput, ExecutorResult, ExecutorContext } from "./types.ts";
import { decryptString } from "../crypto.ts";

/**
 * GitHub: create issue executor.
 * payload: { repo: "owner/repo", title: string, body?: string, labels?: string[] }
 */
export async function githubCreateIssue(input: ExecutorInput, ctx: ExecutorContext): Promise<ExecutorResult> {
  const { repo, title, body, labels } = input.payload as {
    repo?: string; title?: string; body?: string; labels?: string[];
  };

  if (!repo || !title) {
    return { ok: false, provider_result: {}, error_code: "invalid_payload", error_message: "repo and title are required" };
  }

  // Get PAT from connector_secrets
  const pat = await getGithubPat(ctx, input.user_id);
  if (!pat) {
    return { ok: false, provider_result: {}, error_code: "github_not_connected", error_message: "GitHub PAT not found. Connect GitHub first." };
  }

  const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST",
    headers: {
      "Authorization": `token ${pat}`,
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "Morning-Briefing-Bot",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      body: body || "",
      labels: labels || [],
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    return {
      ok: false,
      provider_result: { status: res.status },
      error_code: `github_${res.status}`,
      error_message: data.message || "GitHub API error",
    };
  }

  return {
    ok: true,
    provider_result: {
      issue_number: data.number,
      issue_url: data.html_url,
      issue_id: data.id,
      state: data.state,
    },
  };
}

async function getGithubPat(ctx: ExecutorContext, userId: string): Promise<string | null> {
  const { data } = await ctx.supabase
    .from("connector_secrets")
    .select("secret_ciphertext, secret_iv")
    .eq("user_id", userId)
    .eq("provider", "github")
    .single();

  if (!data?.secret_ciphertext) return null;

  try {
    return await decryptString(data.secret_ciphertext, data.secret_iv, ctx.connectorSecretKey);
  } catch {
    return null;
  }
}
