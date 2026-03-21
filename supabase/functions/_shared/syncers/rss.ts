import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import Parser from "https://esm.sh/rss-parser@3.13.0";
import { stableSourceId } from "../stableId.ts";
import { sanitizeDeep } from "../sanitize.ts";
import { recordSyncAttemptStart, recordSyncSuccess, recordSyncFailure } from "../connectorHealth.ts";

const parser = new Parser();

export async function syncRssForUser(
  supabase: SupabaseClient,
  { userId, runId: existingRunId }: { userId: string; runId?: string }
) {
  const provider = "rss";
  const runId = existingRunId || await recordSyncAttemptStart(supabase, { userId, provider });

  try {
    // 1. Get RSS Config for this user
    const { data: configRow, error: cfgErr } = await supabase
      .from("connector_configs")
      .select("config")
      .eq("user_id", userId)
      .eq("provider", "rss")
      .single();

    if (cfgErr || !configRow) {
      throw new Error("rss_not_configured: RSS configuration not found.");
    }

    const feeds = configRow.config.feeds || [];
    const maxItemsPerRun = configRow.config.max_items_per_run || 30;
    const syncedItems = [];
    let itemsFoundCount = 0;
    let itemsUpsertedCount = 0;

    // 2. Fetch existing feed states for conditional GET
    const { data: feedStates } = await supabase
      .from("rss_feed_state")
      .select("feed_url, etag, last_modified, consecutive_failures")
      .eq("user_id", userId);

    interface RssFeedState {
      feed_url: string;
      etag: string | null;
      last_modified: string | null;
      consecutive_failures: number;
    }
    const stateMap = new Map<string, RssFeedState>((feedStates as RssFeedState[])?.map(s => [s.feed_url, s]) || []);

    // 3. Process each feed
    for (const feed of feeds) {
      const feedUrl = feed.url;
      const state = stateMap.get(feedUrl);
      
      const headers: Record<string, string> = {
        "User-Agent": "Morning-Briefing-Bot/1.0",
      };
      if (state?.etag) headers["If-None-Match"] = state.etag;
      if (state?.last_modified) headers["If-Modified-Since"] = state.last_modified;

      try {
        const response = await fetch(feedUrl, { headers });
        
        // Handle Not Modified
        if (response.status === 304) {
          console.log(`Feed 304 Not Modified: ${feedUrl}`);
          await supabase.from("rss_feed_state").update({ 
              last_fetch_at: new Date().toISOString(),
              consecutive_failures: 0 
          }).eq("user_id", userId).eq("feed_url", feedUrl);
          continue;
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        // Get new validators from headers
        const newEtag = response.headers.get("etag");
        const newLastMod = response.headers.get("last-modified");

        const xml = await response.text();
        const feedData = await parser.parseString(xml);
        
        itemsFoundCount += feedData.items.length;
        
        const feedItems = [];
        for (const entry of feedData.items.slice(0, maxItemsPerRun)) {
          const externalId = entry.guid || entry.link || entry.title;
          if (!externalId) continue;

          const stableId = await stableSourceId("news", externalId);
          const publishedAt = entry.isoDate || entry.pubDate || new Date().toISOString();

          feedItems.push({
            user_id: userId,
            provider: "rss",
            item_type: "news",
            external_id: externalId,
            source_id: stableId,
            occurred_at: publishedAt,
            title: entry.title,
            author: entry.creator || entry.author,
            url: entry.link,
            summary: entry.contentSnippet || entry.description,
            payload: sanitizeDeep({
              source_name: feed.title || feedData.title,
              categories: entry.categories,
              missing_date: !entry.isoDate && !entry.pubDate
            }),
          });
        }

        if (feedItems.length > 0) {
          const { error: upsertErr } = await supabase
            .from("synced_items")
            .upsert(feedItems, { onConflict: "user_id, provider, item_type, external_id" });
          
          if (upsertErr) throw upsertErr;
          itemsUpsertedCount += feedItems.length;
          syncedItems.push(...feedItems);
        }

        // Update state
        await supabase.from("rss_feed_state").upsert({
            user_id: userId,
            feed_url: feedUrl,
            etag: newEtag,
            last_modified: newLastMod,
            last_fetch_at: new Date().toISOString(),
            last_success_at: new Date().toISOString(),
            consecutive_failures: 0
        }, { onConflict: "user_id, feed_url" });

      } catch (feedErr: any) {
        console.error(`Error syncing RSS feed ${feedUrl}:`, feedErr.message);
        await supabase.from("rss_feed_state").upsert({
            user_id: userId,
            feed_url: feedUrl,
            last_fetch_at: new Date().toISOString(),
            consecutive_failures: (state?.consecutive_failures || 0) + 1
        }, { onConflict: "user_id, feed_url" });
      }
    }

    // 4. Record Success
    await recordSyncSuccess(supabase, {
      runId,
      userId,
      provider,
      itemsFound: itemsFoundCount,
      itemsUpserted: itemsUpsertedCount,
      meta: { feed_count: feeds.length }
    });

    return { ok: true, items_synced: itemsUpsertedCount };

  } catch (e: any) {
    console.error("syncRssForUser error:", e.message);
    
    await recordSyncFailure(supabase, {
      runId,
      userId,
      provider,
      errorCode: e.message.includes("rss_not_configured") ? "rss_not_configured" : "rss_sync_error",
      errorMessage: e.message
    });

    throw e;
  }
}
