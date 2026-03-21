import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { config, validateConfig } from "../_shared/config.ts";
import { authorizeRequest } from "../_shared/auth.ts";
import { sanitizeDeep, redactSecrets } from "../_shared/sanitize.ts";
import { AssembledUserData, ConnectorStatus } from "../_shared/userData.ts";
import { getModule, ModuleId } from "../_shared/moduleManifest.ts";
import { migrateProfileIfNeeded } from "../_shared/profileMigration.ts";

validateConfig();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-api-key",
};

// Mapping: provider -> synced_items item_type
const PROVIDER_ITEM_TYPE: Record<string, string> = {
  github: "github_pr",
  rss: "news",
  google: "email",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await authorizeRequest(req, config);
  if (!auth.ok) {
    return new Response(JSON.stringify(auth.body), { status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const userId = auth.user_id!;
  const supabase = createClient(config.SUPABASE_URL!, config.SUPABASE_SERVICE_ROLE_KEY!);

  try {
    // Parse optional profile_id from body
    let profile_id: string | null = null;
    let enabledModules: ModuleId[] = [];
    let moduleSettings: Record<string, any> = {};

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      profile_id = body.profile_id || null;
    }

    // 1. Resolve profile + Rules
    let watchRules: any[] = [];
    if (profile_id) {
      const { data: profile } = await supabase
        .from("briefing_profiles")
        .select("enabled_modules, module_settings, module_catalog_version")
        .eq("id", profile_id)
        .eq("user_id", userId)
        .single();

      if (profile) {
        const migrated = migrateProfileIfNeeded(profile as any);
        enabledModules = (migrated.enabled_modules || []) as ModuleId[];
        moduleSettings = migrated.module_settings || {};
        
        // Fetch rules
        const { data: rules } = await supabase
          .from("watch_rules")
          .select("module_id, rule")
          .eq("profile_id", profile_id);
        watchRules = rules || [];
      }
    }

    if (enabledModules.length === 0) {
      enabledModules = ["ai_news_delta", "github_prs"] as ModuleId[];
    }

    // 2. Derive requirements
    const requiredProviders = new Set<string>();
    const requiredBuckets = new Set<string>();
    for (const modId of enabledModules) {
      const mod = getModule(modId);
      if (!mod || mod.availability === "coming_soon") continue;
      mod.requiredConnectors.forEach(c => requiredProviders.add(c.provider));
      mod.requiredBuckets.forEach(b => requiredBuckets.add(b));
    }

    // 3. Fetch Connector Health (Primary Source)
    const { data: healthRows } = await supabase
      .from("connector_health")
      .select("*")
      .eq("user_id", userId);

    const healthMap = new Map<string, any>();
    (healthRows || []).forEach(h => healthMap.set(h.provider, h));

    // 4. Fetch Legacy Connections (Fallback for UI status during transition)
    const { data: connections } = await supabase
      .from("connector_connections")
      .select("provider, status, last_sync_at")
      .eq("user_id", userId);

    const connectionMap = new Map<string, any>();
    (connections || []).forEach(c => connectionMap.set(c.provider, c));

    // 5. Build connector_status[]
    const connector_status: ConnectorStatus[] = [];
    for (const provider of requiredProviders) {
      const health = healthMap.get(provider);
      const conn = connectionMap.get(provider);
      
      let status: ConnectorStatus["status"];
      let message: string;
      let connected = false;

      if (provider === "weather") {
        status = "active";
        message = "Weather service is active.";
        connected = true;
      } else if (health) {
        status = health.status as ConnectorStatus["status"];
        connected = health.connected;
        if (status === "error") {
          message = health.last_error_message || `${capitalize(provider)} sync failed.`;
        } else if (status === "missing" || !connected) {
          message = `${capitalize(provider)} connector is not linked.`;
        } else {
          message = `${capitalize(provider)} connector is active.`;
        }
      } else if (conn) {
        // Fallback to legacy connection status if health row missing
        status = (conn.status === "error" ? "error" : "active") as ConnectorStatus["status"];
        connected = status === "active";
        message = connected ? `${capitalize(provider)} is active.` : `${capitalize(provider)} needs setup.`;
      } else {
        status = "missing";
        message = `${capitalize(provider)} connector is missing.`;
        connected = false;
      }

      connector_status.push(sanitizeDeep({
        source_id: `connector_${provider}_status`,
        provider,
        connected,
        last_sync_time_iso: health?.last_success_at || conn?.last_sync_at || null,
        status,
        message,
      }) as ConnectorStatus);
    }

    // 6. Assemble Buckets (rest of the logic remains similar but uses health-aware status)
    const defaultSince = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    const sinceByModule: Record<string, string> = {};

    if (enabledModules.length > 0) {
      const { data: moduleStates } = await supabase
        .from("briefing_module_state")
        .select("module_id, last_seen_at")
        .eq("user_id", userId)
        .in("module_id", enabledModules);

      (moduleStates || []).forEach((s: any) => {
        sinceByModule[s.module_id] = s.last_seen_at || defaultSince;
      });
    }

    enabledModules.forEach(mod => { if (!sinceByModule[mod]) sinceByModule[mod] = defaultSince; });

    const { data: rssConfig } = await supabase
      .from("connector_configs")
      .select("config")
      .eq("user_id", userId)
      .eq("provider", "rss")
      .maybeSingle();

    const globalKeywords: string[] = rssConfig?.config?.keywords || [];

    const userData: AssembledUserData = {
      news_items: [],
      github_prs: [],
      emails_unread: [],
      calendar_events: [],
      jira_tasks: [],
      weather: [],
      connector_status,
    };

    // Helper to check if a provider is functionally connected in user_data
    const isProviderConnected = (p: string) => connector_status.find(c => c.provider === p)?.connected;

    // WEATHER
    if (requiredBuckets.has("weather")) {
      const mod = getModule("weather")!;
      const settings = moduleSettings["weather"] || mod.defaults.settings;
      userData.weather = [{
        source_id: "weather_placeholder",
        location: "Your Area",
        current_temp_f: 72,
        forecast_high_f: 75,
        forecast_low_f: 65,
        summary: `Mainly sunny today with a high of 75F. Outlook for ${settings.caps || 1} day(s) remains clear.`,
      }];
    }

    // NEWS
    if (requiredBuckets.has("news_items") && isProviderConnected("rss")) {
      const mod = getModule("ai_news_delta")!;
      const newsSince = sinceByModule["ai_news_delta"] || defaultSince;
      const { data: newsItems } = await supabase
        .from("synced_items")
        .select("*")
        .eq("user_id", userId)
        .eq("item_type", "news")
        .gt("occurred_at", newsSince)
        .order("occurred_at", { ascending: false })
        .limit(30);

      const settings = moduleSettings["ai_news_delta"] || mod.defaults.settings;
      const caps = settings.caps ?? mod.defaults.maxSegments;
      const activeKeywords = settings.filter_keywords?.length > 0 ? settings.filter_keywords : globalKeywords;
      
      const newsRule = watchRules.find(r => r.module_id === "ai_news_delta")?.rule || {};
      const { include_keywords = [], exclude_keywords = [] } = newsRule;

      userData.news_items = scoreItems(newsItems || [], activeKeywords, { include_keywords, exclude_keywords })
        .slice(0, caps).map((i: any) => ({
          source_id: i.source_id,
          title: i.title,
          source_name: i.payload?.source_name || "RSS",
          url: i.url,
          published_time_iso: i.occurred_at,
          snippet: i.summary?.slice(0, 300) || "",
          priority: i.priority || false
        }));
    }

    // GITHUB
    if (requiredBuckets.has("github_prs") && isProviderConnected("github")) {
      const mod = getModule("github_prs")!;
      const settings = moduleSettings["github_prs"] || mod.defaults.settings;
      const caps = settings.caps ?? mod.defaults.maxSegments;
      
      const githubRule = watchRules.find(r => r.module_id === "github_prs")?.rule || {};
      const { repos = [], authors = [], require_review_requested = false } = githubRule;

      const { data: prItems } = await supabase
        .from("synced_items")
        .select("*")
        .eq("user_id", userId)
        .eq("item_type", "github_pr")
        .order("occurred_at", { ascending: false })
        .limit(50); // Fetch more for filtering

      const filteredPrs = (prItems || []).filter(i => {
        if (repos.length > 0 && !repos.includes(i.payload?.repo)) return false;
        if (authors.length > 0 && !authors.includes(i.payload?.author)) return false;
        if (require_review_requested && i.payload?.status !== "review_requested") return false;
        return true;
      });

      userData.github_prs = filteredPrs.slice(0, caps).map((i: any) => ({
        source_id: i.source_id,
        repo: i.payload?.repo || "Unknown Repo",
        title: i.title,
        url: i.url,
        author_display: i.payload?.author || "Unknown",
        status: i.payload?.status || "open",
        updated_time_iso: i.occurred_at,
        priority: true // GitHub watchlist items are high priority by default if filtered
      }));
    }

    // EMAILS
    if (requiredBuckets.has("emails_unread") && isProviderConnected("google")) {
      const mod = getModule("inbox_triage")!;
      const settings = moduleSettings["inbox_triage"] || mod.defaults.settings;
      const caps = settings.caps ?? mod.defaults.maxSegments;

      const inboxRule = watchRules.find(r => r.module_id === "inbox_triage")?.rule || {};
      const { include_senders = [], include_subject_keywords = [] } = inboxRule;

      const { data: emailItems } = await supabase
        .from("synced_items")
        .select("*")
        .eq("user_id", userId)
        .eq("item_type", "email")
        .order("occurred_at", { ascending: false })
        .limit(50);

      const filteredEmails = (emailItems || []).map(i => {
        const fromVal = i.payload?.from || "";
        const titleVal = i.title || "";
        let priority = false;
        if (include_senders.some((s: string) => fromVal.toLowerCase().includes(s.toLowerCase()))) priority = true;
        if (include_subject_keywords.some((s: string) => titleVal.toLowerCase().includes(s.toLowerCase()))) priority = true;
        return { ...i, priority };
      }).sort((a,b) => (b.priority ? 1 : 0) - (a.priority ? 1 : 0));

      userData.emails_unread = filteredEmails.slice(0, caps).map((i: any) => ({
        source_id: i.source_id,
        from_display: i.payload?.from || "Unknown",
        subject: i.title,
        snippet: i.summary?.slice(0, 200) || "",
        received_time_iso: i.occurred_at,
        email_id: i.payload?.email_id || i.source_id,
        thread_id: i.payload?.thread_id || "",
        priority: i.priority
      }));
    }

    // CALENDAR (Stub for now)
    if (requiredBuckets.has("calendar_events") && isProviderConnected("google")) {
      const mod = getModule("calendar_today")!;
      const settings = moduleSettings["calendar_today"] || mod.defaults.settings;
      userData.calendar_events = [{
        source_id: "cal_1",
        title: "Example Meeting",
        start_time_iso: new Date().toISOString(),
        end_time_iso: new Date(Date.now() + 3600000).toISOString(),
        join_url: "https://zoom.us/j/123",
      }].slice(0, settings.caps || 3);
    }

    return new Response(JSON.stringify({
      user_data: sanitizeDeep(userData),
      meta: {
        profile_id,
        enabled_modules: enabledModules,
        connector_status_summary: connector_status.map(c => ({ provider: c.provider, status: c.status })),
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (e: any) {
    console.error("assemble-user-data error:", e.message);
    return new Response(JSON.stringify({ error: redactSecrets(e.message) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function scoreItems(items: any[], keywords: string[], rule: { include_keywords?: string[], exclude_keywords?: string[] } = {}): any[] {
  const { include_keywords = [], exclude_keywords = [] } = rule;
  
  return items.filter(item => {
    const searchSpace = `${item.title} ${item.summary || ""}`.toLowerCase();
    // Deterministic exclusion
    if (exclude_keywords.some(kw => searchSpace.includes(kw.toLowerCase()))) return false;
    return true;
  }).map(item => {
    let score = 0;
    let priority = false;
    const searchSpace = `${item.title} ${item.summary || ""}`.toLowerCase();
    
    // Legacy scoring
    keywords.forEach(kw => { if (searchSpace.includes(kw.toLowerCase())) score += 3; });
    
    // Watchlist Inclusion (Higher Priority)
    if (include_keywords.some(kw => searchSpace.includes(kw.toLowerCase()))) {
      score += 10;
      priority = true;
    }

    const ageMs = Date.now() - new Date(item.occurred_at).getTime();
    if (ageMs < 6 * 60 * 60 * 1000) score += 2;
    
    return { ...item, score, priority };
  }).sort((a, b) => b.score - a.score || new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
}

function capitalize(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }
