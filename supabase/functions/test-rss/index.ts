import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Parser from "https://esm.sh/rss-parser@3.13.0";
import { config, validateConfig } from "../_shared/config.ts";
import { authorizeRequest } from "../_shared/auth.ts";
import { assertSafeFetchUrl } from "../_shared/ssrfGuard.ts";

validateConfig();
const parser = new Parser();

const corsHeaders = {
  // OWASP A05: Removed wildcard '*' and restricted to specific allowed origins
  // In production, these should be configured via environment variables or database
  "Access-Control-Allow-Origin": config.SUPABASE_URL || "https://*.e2b.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-api-key, x-user-id, x-preview-user-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
  // OWASP A05: Security Headers
  "Cross-Origin-Resource-Policy": "same-origin",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none';",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await authorizeRequest(req, config);
  if (!auth.ok) {
    return new Response(JSON.stringify(auth.body), { status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ ok: false, message: "Missing feed URL" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let safeUrl: string;
    try {
      safeUrl = assertSafeFetchUrl(url);
    } catch (e: any) {
      return new Response(JSON.stringify({ ok: false, message: e.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const res = await fetch(safeUrl, { headers: { "User-Agent": "Morning-Briefing-Bot/1.0" } });
    if (!res.ok) throw new Error(`Feed fetch failed: ${res.status}`);
    
    const xml = await res.text();
    const feed = await parser.parseString(xml);

    return new Response(JSON.stringify({ 
      ok: true, 
      title: feed.title || "Unknown Feed",
      itemCount: feed.items?.length || 0
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, message: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
