import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { recordSyncAttemptStart, recordSyncSuccess, recordSyncFailure } from "../connectorHealth.ts";

/**
 * Syncs stock quotes for configured tickers using Yahoo Finance v8 public API.
 * No API key required.
 */
export async function syncStocksForUser(
  supabase: SupabaseClient,
  { userId, runId: existingRunId }: { userId: string; runId?: string }
) {
  const provider = "stocks";
  const runId = existingRunId || await recordSyncAttemptStart(supabase, { userId, provider });

  try {
    // 1. Get stocks config
    const { data: configRow } = await supabase
      .from("connector_configs")
      .select("config")
      .eq("user_id", userId)
      .eq("provider", provider)
      .single();

    const tickers: string[] = (configRow?.config?.tickers || "AAPL,GOOGL,MSFT")
      .split(",")
      .map((t: string) => t.trim().toUpperCase())
      .filter(Boolean);

    if (tickers.length === 0) {
      throw new Error("stocks_no_tickers: No stock tickers configured.");
    }

    // 2. Fetch quotes (batch via Yahoo Finance v8 quote endpoint — public, no key)
    const symbols = tickers.join(",");
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${tickers[0]}?interval=1d&range=1d`;

    const upserts = [];
    const today = new Date().toISOString().split("T")[0];

    for (const ticker of tickers) {
      try {
        const res = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=5d`,
          { headers: { "User-Agent": "MorningBriefBot/1.0" } }
        );

        if (!res.ok) {
          console.warn(`Stock fetch failed for ${ticker}: ${res.status}`);
          continue;
        }

        const data = await res.json();
        const result = data?.chart?.result?.[0];
        if (!result) continue;

        const meta = result.meta;
        const price = meta.regularMarketPrice;
        const prevClose = meta.chartPreviousClose || meta.previousClose;
        const change = price && prevClose ? ((price - prevClose) / prevClose * 100).toFixed(2) : null;

        upserts.push({
          user_id: userId,
          provider,
          item_type: "stock_quote",
          source_id: `stock-${ticker}-${today}`,
          occurred_at: new Date().toISOString(),
          title: `${meta.shortName || ticker}: $${price?.toFixed(2) || "N/A"}`,
          summary: `${ticker} trading at $${price?.toFixed(2)}. ${change ? (parseFloat(change) >= 0 ? `Up ${change}%` : `Down ${change}%`) : ""} from previous close ($${prevClose?.toFixed(2)}).`,
          url: `https://finance.yahoo.com/quote/${ticker}`,
          payload: {
            ticker,
            price,
            previous_close: prevClose,
            change_percent: change ? parseFloat(change) : null,
            currency: meta.currency,
            exchange: meta.exchangeName,
            market_state: meta.marketState,
          },
        });
      } catch (tickerErr: any) {
        console.warn(`Error fetching ${ticker}:`, tickerErr.message);
      }
    }

    // 3. Upsert
    let itemsSynced = 0;
    if (upserts.length > 0) {
      const { error: upsertErr } = await supabase
        .from("synced_items")
        .upsert(upserts, { onConflict: "source_id" });
      if (upsertErr) throw upsertErr;
      itemsSynced = upserts.length;
    }

    await recordSyncSuccess(supabase, {
      runId,
      userId,
      provider,
      itemsFound: tickers.length,
      itemsUpserted: itemsSynced,
      meta: { tickers: tickers.join(",") },
    });

    return { ok: true, items_synced: itemsSynced };
  } catch (e: any) {
    console.error("syncStocksForUser error:", e.message);

    await recordSyncFailure(supabase, {
      runId,
      userId,
      provider,
      errorCode: "stocks_sync_error",
      errorMessage: e.message,
    });

    throw e;
  }
}
