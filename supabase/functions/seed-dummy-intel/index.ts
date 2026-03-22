import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config, validateConfig } from "../_shared/config.ts";
import { authorizeRequest } from "../_shared/auth.ts";
import { initOrUpsertHealthOnConnect } from "../_shared/connectorHealth.ts";

validateConfig();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-api-key, x-user-id, x-preview-user-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await authorizeRequest(req, config);
  if (!auth.ok) {
    return new Response(JSON.stringify(auth.body), { status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const userId = auth.user_id!;
  const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);
  const { include = {}, mark_connected = true } = await req.json();

  try {
    const items = [];
    
    if (include.rss) {
      items.push({
        user_id: userId,
        provider: "rss",
        source_id: "dummy:rss:1",
        title: "Global Tech Market Update",
        summary: "The global tech market shows strong recovery in Q1 2026, driven by AI infrastructure spending.",
        url: "https://example.com/rss/1",
        occurred_at: new Date().toISOString()
      });
    }

    if (include.github) {
      items.push({
        user_id: userId,
        provider: "github",
        source_id: "dummy:github:1",
        title: "PR #124: New Vector Search Implementation",
        summary: "Merged a new highly efficient vector search indexing strategy for RAG pipelines.",
        url: "https://github.com/example/repo/pull/124",
        occurred_at: new Date().toISOString()
      });
    }

    if (include.slack) {
      items.push({
        user_id: userId,
        provider: "slack",
        source_id: "dummy:slack:1",
        title: "Message from @alex",
        summary: "Alex mentioned that the Q3 deployment schedule is now finalized in the architecture channel.",
        url: "https://slack.com/archives/C123/P456",
        occurred_at: new Date().toISOString()
      });
    }

    if (items.length > 0) {
      const { error } = await supabase.from("synced_items").upsert(items, { onConflict: 'user_id,provider,source_id' });
      if (error) throw error;
    }

    if (mark_connected) {
      for (const provider of ['rss', 'github', 'slack', 'google', 'notion', 'weather']) {
        if (include[provider]) {
          await initOrUpsertHealthOnConnect(supabase, { userId, provider, connected: true, status: 'active' });
        }
      }
    }

    return new Response(JSON.stringify({ 
      ok: true, 
      upserted_count: items.length,
      message: `Successfully seeded ${items.length} items.`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, message: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
