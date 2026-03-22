import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { stableSourceId } from "../stableId.ts";
import { sanitizeDeep } from "../sanitize.ts";
import { decryptString } from "../crypto.ts";
import { recordSyncAttemptStart, recordSyncSuccess, recordSyncFailure } from "../connectorHealth.ts";

export async function syncGithubForUser(
  supabase: SupabaseClient,
  { userId, secretKey, runId: existingRunId }: { userId: string; secretKey: string; runId?: string }
) {
  const provider = "github";
  const runId = existingRunId || await recordSyncAttemptStart(supabase, { userId, provider });

  try {
    // 1. Get GitHub Secrets
    const { data: connSecret, error: connErr } = await supabase
      .from("connector_secrets")
      .select("secret_ciphertext, secret_iv")
      .eq("user_id", userId)
      .eq("provider", "github")
      .single();

    if (connErr || !connSecret?.secret_ciphertext) {
      throw new Error("github_not_configured: GitHub secret not found.");
    }

    const pat = await decryptString(connSecret.secret_ciphertext, connSecret.secret_iv, secretKey);

    // 2. Fetch User identity
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        "Authorization": `token ${pat}`,
        "User-Agent": "Morning-Briefing-Bot"
      }
    });

    if (!userRes.ok) {
        if (userRes.status === 401) throw new Error("github_401: Unauthorized.");
        throw Error(`GitHub Identity Error: ${userRes.status}`);
    }
    const userData = await userRes.json();
    const login = userData.login;

    // 3. Fetch PRs
    const query = `is:pr is:open archived:false review-requested:${login}`;
    const ghResponse = await fetch(`https://api.github.com/search/issues?q=${encodeURIComponent(query)}&sort=updated&order=desc`, {
      headers: {
        "Authorization": `token ${pat}`,
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Morning-Briefing-Bot"
      }
    });

    if (!ghResponse.ok) {
        throw new Error(`github_api_error: ${ghResponse.status}`);
    }

    const prData = await ghResponse.json();
    const syncedItems = [];

    for (const pr of prData.items) {
      const externalId = pr.node_id || pr.html_url;
      if (!externalId) continue;
      const stableId = await stableSourceId("pr", externalId);

      syncedItems.push({
        user_id: userId,
        provider: "github",
        item_type: "github_pr",
        external_id: externalId,
        source_id: stableId,
        occurred_at: pr.updated_at,
        title: pr.title,
        author: pr.user.login,
        url: pr.html_url,
        summary: sanitizeDeep(pr.body?.slice(0, 500) || "No description provided"),
        payload: sanitizeDeep({
          repo: pr.repository_url.split("/").slice(-2).join("/"),
          status: pr.state || "open",
          author: pr.user?.login || "Unknown",
          updated_at: pr.updated_at,
        }),
      });
    }

    // 4. Batched Upsert
    if (syncedItems.length > 0) {
      const { error: upsertErr } = await supabase
        .from("synced_items")
        .upsert(syncedItems, { onConflict: "user_id, provider, item_type, external_id" });
      
      if (upsertErr) throw upsertErr;
    }

    // 5. Record Success
    await recordSyncSuccess(supabase, {
      runId,
      userId,
      provider,
      itemsFound: prData.items.length,
      itemsUpserted: syncedItems.length,
      meta: { github_login: login }
    });

    return { ok: true, items_synced: syncedItems.length };

  } catch (e: any) {
    console.error("syncGithubForUser error:", e.message);

    await recordSyncFailure(supabase, {
      runId,
      userId,
      provider,
      errorCode: e.message.includes("github_401") ? "github_401" : "github_sync_error",
      errorMessage: e.message
    });

    throw e;
  }
}
