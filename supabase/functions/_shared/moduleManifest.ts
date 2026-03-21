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
  | "watchlist_alerts";

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
    type: "number" | "text" | "multiselect";
    options?: string[];
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
    settingsUi: [{ key: "caps", label: "Days Forecast", type: "number" }],
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
    settingsUi: [{ key: "caps", label: "Max Meetings", type: "number" }],
  },
  {
    id: "inbox_triage",
    name: "Inbox Triage",
    label: "Inbox Triage",
    description: "Summarizes urgent unread emails that need your attention.",
    availability: "beta",
    allowedCardTypes: ["email_reply"],
    requiredConnectors: [{ provider: "google" }],
    requiredBuckets: ["emails_unread"],
    defaults: { maxSegments: 3, settings: { caps: 3 } },
    settingsSchema: z.object({ caps: z.number().min(1).max(10).optional() }),
    settingsUi: [{ key: "caps", label: "Max Emails", type: "number" }],
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
    defaults: { maxSegments: 5, settings: { caps: 5 } },
    settingsSchema: z.object({ caps: z.number().min(1).max(20).optional() }),
    settingsUi: [{ key: "caps", label: "Max PRs", type: "number" }],
  },
  {
    id: "github_mentions",
    name: "GitHub Mentions",
    label: "GitHub Mentions",
    description: "Recent mentions of your handle in issues or discussions.",
    availability: "coming_soon",
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
    id: "ai_news_delta",
    name: "AI News Delta",
    label: "AI News Delta",
    description: "Deep-dive into new AI research and industry shifts.",
    availability: "ready",
    allowedCardTypes: ["link_open"],
    requiredConnectors: [{ provider: "rss" }],
    requiredBuckets: ["news_items"],
    defaults: { maxSegments: 5, settings: { caps: 3, filter_keywords: [] } },
    settingsSchema: z.object({
      caps: z.number().min(1).max(10).optional(),
      filter_keywords: z.array(z.string()).optional(),
    }),
    settingsUi: [
      { key: "caps", label: "Max Highlights", type: "number" },
      { key: "filter_keywords", label: "Keywords", type: "multiselect", options: ["LLM", "Robotics", "Agents", "OpenSource"] },
    ],
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
    availability: "coming_soon",
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
    availability: "coming_soon",
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
