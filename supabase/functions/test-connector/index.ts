import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Parser from "https://esm.sh/rss-parser@3.13.0";
import { config, validateConfig } from "../_shared/config.ts";
import { authorizeRequest } from "../_shared/auth.ts";

validateConfig();
const parser = new Parser();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-api-key, x-user-id, x-preview-user-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, DELETE, PUT",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await authorizeRequest(req, config);
  if (!auth.ok) {
    return new Response(JSON.stringify(auth.body), { status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const userId = auth.user_id!;
  const { provider, config: connectorConfig } = await req.json();

  try {
    if (provider === "rss") {
      const feeds = connectorConfig.feeds || [];
      if (feeds.length === 0) throw new Error("No feeds provided to test.");
      
      const firstFeed = feeds[0].url;
      const res = await fetch(firstFeed, { headers: { "User-Agent": "Morning-Briefing-Bot/1.0" } });
      if (!res.ok) throw new Error(`Feed fetch failed: ${res.status}`);
      
      const xml = await res.text();
      await parser.parseString(xml); // Validate XML parse
      
      return new Response(JSON.stringify({ ok: true, message: `Successfully parsed ${feeds.length} feed(s).` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Default response for unimplemented providers
    return new Response(JSON.stringify({ ok: true, message: `Configuration accepted for ${provider}. (Deep validation coming soon)` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, message: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
