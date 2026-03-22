import { z } from "https://esm.sh/zod@3.22.4";

/** 
 * Versioning for the Module Catalog.
 * Increment this when making breaking changes to module settings schemas or IDs.
 */
export const MODULE_CATALOG_VERSION = 1;

export type ModuleId = 
  | "weather" 
  | "calendar_today" 
  | "ai_news_delta" 
  | "github_prs" 
  | "github_mentions"
  | "inbox_triage" 
  | "jira_tasks" 
  | "focus_plan"
  | "linkedin_network"
  | "hn_top"
  | "reading_list_reminders"
  | "newsletters_digest"
  | "watchlist_alerts"
  | "slack_updates";

export interface ModuleDefinition {
  id: ModuleId;
  name: string;
  label: string;
  description: string;
  availability: "ready" | "beta" | "coming_soon";
  allowedCardTypes: string[];
  requiredConnectors: Array<{ provider: string }>;
  requiredBuckets: string[];
  defaults: {
    maxSegments: number;
    settings: Record<string, any>;
  };
  settingsSchema: z.ZodType<any>;
  settingsUi: Array<{
    key: string;
    label: string;
    type: "number" | "text" | "multiselect" | "boolean";
    options?: string[];
    placeholder?: string;
    description?: string;
  }>;
}

export const MODULE_CATALOG: readonly ModuleDefinition[] = [
  {
    id: "weather",
    name: "Local Weather",
    label: "Local Weather",
    description: "Current conditions and daily forecast for your location.",
    availability: "ready",
    allowedCardTypes: ["weather_widget"],
    requiredConnectors: [{ provider: "weather" }],
    requiredBuckets: ["weather"],
    defaults: { maxSegments: 1, settings: { caps: 1 } },
    settingsSchema: z.object({ caps: z.number().min(1).max(3).optional() }),
    settingsUi: [{ key: "caps", label: "Days Forecast", type: "number", description: "Number of days to include in the forecast." }],
  },
  {
    id: "calendar_today",
    name: "Calendar Today",
    label: "Calendar Today",
    description: "Your agenda and meeting links for the next 24 hours.",
    availability: "ready",
    allowedCardTypes: ["calendar_join"],
    requiredConnectors: [{ provider: "google" }],
    requiredBuckets: ["calendar_events"],
    defaults: { maxSegments: 3, settings: { caps: 3 } },
    settingsSchema: z.object({ caps: z.number().min(1).max(10).optional() }),
    settingsUi: [{ key: "caps", label: "Max Meetings", type: "number", description: "Maximum number of events to show." }],
  },
  {
    id: "inbox_triage",
    name: "Inbox Triage",
    label: "Inbox Triage",
    description: "Summarizes urgent unread emails that need your attention.",
    availability: "ready",
    allowedCardTypes: ["email_reply"],
    requiredConnectors: [{ provider: "google" }],
    requiredBuckets: ["emails_unread"],
    defaults: { maxSegments: 3, settings: { caps: 3, keywords: ["urgent", "action"], important_labels: ["INBOX"] } },
    settingsSchema: z.object({ 
      caps: z.number().min(1).max(10).optional(),
      keywords: z.array(z.string()).optional(),
      important_labels: z.array(z.string()).optional()
    }),
    settingsUi: [
      { key: "caps", label: "Max Emails", type: "number", description: "Limit the number of prioritized emails." },
      { key: "keywords", label: "Urgency Keywords", type: "multiselect", placeholder: "e.g. urgent, asap, help...", description: "Emails containing these words are prioritized." },
      { key: "important_labels", label: "Preferred Labels", type: "multiselect", placeholder: "e.g. INBOX, WORK...", description: "Only summarize emails with these labels." }
    ],
  },
  {
    id: "github_prs",
    name: "GitHub PRs",
    label: "GitHub PRs",
    description: "Open Pull Requests assigned to you or requiring your review.",
    availability: "ready",
    allowedCardTypes: ["github_review"],
    requiredConnectors: [{ provider: "github" }],
    requiredBuckets: ["github_prs"],
    defaults: { maxSegments: 5, settings: { caps: 5, repositories: [], include_drafts: false } },
    settingsSchema: z.object({ 
      caps: z.number().min(1).max(20).optional(),
      repositories: z.array(z.string()).optional(),
      include_drafts: z.boolean().optional()
    }),
    settingsUi: [
      { key: "caps", label: "Max PRs", type: "number", description: "Maximum number of PRs to track." },
      { key: "repositories", label: "Target Repositories", type: "multiselect", placeholder: "e.g. owner/repo...", description: "Only track PRs from these specific repositories." },
      { key: "include_drafts", label: "Include Drafts", type: "boolean", description: "Toggle to include PRs currently in draft state." }
    ],
  },
  {
    id: "slack_updates",
    name: "Slack Updates",
    label: "Slack Updates",
    description: "Summarizes missed messages and @mentions from your Slack teams.",
    availability: "beta",
    allowedCardTypes: ["link_open"],
    requiredConnectors: [{ provider: "slack" }],
    requiredBuckets: ["slack_messages"],
    defaults: { maxSegments: 3, settings: { caps: 3, channels: [], mention_only: true } },
    settingsSchema: z.object({ 
      caps: z.number().min(1).max(10).optional(),
      channels: z.array(z.string()).optional(),
      mention_only: z.boolean().optional()
    }),
    settingsUi: [
      { key: "caps", label: "Max Summaries", type: "number" },
      { key: "channels", label: "Followed Channels", type: "multiselect", placeholder: "#general, #dev...", description: "Specific channels to monitor for updates." },
      { key: "mention_only", label: "Only Mentions", type: "boolean", description: "If enabled, only summarizes messages where you are @mentioned." }
    ],
  },
  {
    id: "ai_news_delta",
    name: "AI News Delta",
    label: "AI News Delta",
    description: "Deep-dive into new AI research and industry shifts.",
    availability: "ready",
    allowedCardTypes: ["link_open"],
    requiredConnectors: [{ provider: "rss" }],
    requiredBuckets: ["news_items"],
    defaults: { maxSegments: 5, settings: { caps: 3, filter_keywords: [], rss_feeds: [] } },
    settingsSchema: z.object({
      caps: z.number().min(1).max(10).optional(),
      filter_keywords: z.array(z.string()).optional(),
      rss_feeds: z.array(z.string()).optional()
    }),
    settingsUi: [
      { key: "caps", label: "Max Highlights", type: "number" },
      { key: "filter_keywords", label: "Focus Keywords", type: "multiselect", placeholder: "e.g. LLM, Agents...", description: "Prioritize news relating to these topics." },
      { key: "rss_feeds", label: "Custom RSS Feeds", type: "multiselect", placeholder: "https://example.com/rss...", description: "Additional RSS sources to monitor." },
    ],
  },
  {
    id: "github_mentions",
    name: "GitHub Mentions",
    label: "GitHub Mentions",
    description: "Recent mentions of your handle in issues or discussions.",
    availability: "beta",
    allowedCardTypes: ["link_open"],
    requiredConnectors: [{ provider: "github" }],
    requiredBuckets: ["github_mentions"],
    defaults: { maxSegments: 3, settings: { caps: 3 } },
    settingsSchema: z.object({ caps: z.number().min(1).max(10).optional() }),
    settingsUi: [{ key: "caps", label: "Max Mentions", type: "number" }],
  },
  {
    id: "jira_tasks",
    name: "Jira Tasks",
    label: "Jira Tasks",
    description: "Top priority tickets from your active sprint.",
    availability: "beta",
    allowedCardTypes: ["link_open"],
    requiredConnectors: [{ provider: "jira" }],
    requiredBuckets: ["jira_tasks"],
    defaults: { maxSegments: 5, settings: { caps: 5 } },
    settingsSchema: z.object({ caps: z.number().min(1).max(20).optional() }),
    settingsUi: [{ key: "caps", label: "Max Issues", type: "number" }],
  },
  {
    id: "newsletters_digest",
    name: "Newsletters Digest",
    label: "Newsletters Digest",
    description: "Consolidated view of your subscribed technical newsletters.",
    availability: "beta",
    allowedCardTypes: ["email_reply", "link_open"],
    requiredConnectors: [{ provider: "google" }],
    requiredBuckets: ["emails_unread"],
    defaults: { maxSegments: 3, settings: { caps: 3 } },
    settingsSchema: z.object({ caps: z.number().min(1).max(10).optional() }),
    settingsUi: [{ key: "caps", label: "Max Newsletters", type: "number" }],
  },
  {
    id: "focus_plan",
    name: "Deep Work Plan",
    label: "Deep Work Plan",
    description: "AI-generated schedule for your highest-impact tasks.",
    availability: "coming_soon",
    allowedCardTypes: ["link_open"],
    requiredConnectors: [],
    requiredBuckets: [],
    defaults: { maxSegments: 1, settings: {} },
    settingsSchema: z.object({}),
    settingsUi: [],
  },
  {
    id: "watchlist_alerts",
    name: "Watchlist Alerts",
    label: "Watchlist Alerts",
    description: "Sentiment alerts for your curated stock or crypto watchlist.",
    availability: "coming_soon",
    allowedCardTypes: ["link_open"],
    requiredConnectors: [],
    requiredBuckets: [],
    defaults: { maxSegments: 3, settings: { symbols: [] } },
    settingsSchema: z.object({ symbols: z.array(z.string()).optional() }),
    settingsUi: [{ key: "symbols", label: "Symbols", type: "multiselect", options: ["AAPL", "TSLA", "BTC", "ETH"] }],
  },
  {
    id: "linkedin_network",
    name: "LinkedIn Network",
    label: "LinkedIn Network",
    description: "Key updates from your professional network.",
    availability: "coming_soon",
    allowedCardTypes: ["link_open"],
    requiredConnectors: [],
    requiredBuckets: [],
    defaults: { maxSegments: 3, settings: {} },
    settingsSchema: z.object({}),
    settingsUi: [],
  },
  {
    id: "hn_top",
    name: "Hacker News",
    label: "Hacker News",
    description: "Top trending stories from Hacker News.",
    availability: "ready",
    allowedCardTypes: ["link_open"],
    requiredConnectors: [],
    requiredBuckets: [],
    defaults: { maxSegments: 5, settings: {} },
    settingsSchema: z.object({}),
    settingsUi: [],
  },
  {
    id: "reading_list_reminders",
    name: "Reading List Reminders",
    label: "Reading List Reminders",
    description: "Reminders for items you saved to your reading list.",
    availability: "ready",
    allowedCardTypes: ["link_open"],
    requiredConnectors: [],
    requiredBuckets: [],
    defaults: { maxSegments: 3, settings: {} },
    settingsSchema: z.object({}),
    settingsUi: [],
  }
];

export function getModule(id: ModuleId): ModuleDefinition | undefined {
  return MODULE_CATALOG.find(m => m.id === id);
}

export function validateModuleIds(ids: any): ModuleId[] {
  if (!Array.isArray(ids)) return [];
  const validIds = MODULE_CATALOG.map(m => m.id);
  return ids.filter(id => typeof id === "string" && validIds.includes(id as any)) as ModuleId[];
}

export function validateModuleSettings(id: ModuleId, settings: any): { ok: boolean; value?: any; error?: string } {
  const mod = getModule(id);
  if (!mod) return { ok: false, error: "Unknown module" };
  
  const result = mod.settingsSchema.safeParse(settings || {});
  if (result.success) {
    return { ok: true, value: result.data };
  } else {
    return { ok: false, error: result.error.message };
  }
}

export function getPublicCatalogView() {
  return MODULE_CATALOG.map(m => ({
    id: m.id,
    label: m.label,
    description: m.description,
    availability: m.availability,
    requiredConnectors: m.requiredConnectors,
    defaults: m.defaults,
    settingsUi: m.settingsUi,
  }));
}
