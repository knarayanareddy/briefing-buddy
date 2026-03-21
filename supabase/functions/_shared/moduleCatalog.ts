export type ModuleId = 
  | "weather"
  | "calendar_today"
  | "inbox_triage"
  | "github_prs"
  | "github_mentions"
  | "jira_tasks"
  | "ai_news_delta"
  | "newsletters_digest"
  | "focus_plan"
  | "watchlist_alerts";

export interface ProviderRequirement {
  provider: "rss" | "github" | "google" | "calendar" | "jira" | "weather";
  optional: boolean;
}

export interface ModuleManifest {
  id: ModuleId;
  label: string;
  description: string;
  requiredConnectors: ProviderRequirement[];
  requiredUserDataBuckets: string[];
  defaultSettings: Record<string, any>;
  allowedCardTypes: string[];
}

export const MODULE_CATALOG: Record<ModuleId, ModuleManifest> = {
  weather: {
    id: "weather",
    label: "Local Weather",
    description: "Current temperature and conditions based on your location.",
    requiredConnectors: [], // Usually public/IP based, no strict token
    requiredUserDataBuckets: ["weather"],
    defaultSettings: { caps: 1 },
    allowedCardTypes: ["weather_widget"]
  },
  calendar_today: {
    id: "calendar_today",
    label: "Today's Meetings",
    description: "Your upcoming calendar events and meeting links.",
    requiredConnectors: [{ provider: "google", optional: true }],
    requiredUserDataBuckets: ["calendar_events"],
    defaultSettings: { caps: 3 },
    allowedCardTypes: ["calendar_join"]
  },
  inbox_triage: {
    id: "inbox_triage",
    label: "Inbox Triage",
    description: "High-priority unread emails requiring your attention.",
    requiredConnectors: [{ provider: "google", optional: false }],
    requiredUserDataBuckets: ["emails"],
    defaultSettings: { caps: 3 },
    allowedCardTypes: ["email_reply"]
  },
  github_prs: {
    id: "github_prs",
    label: "GitHub PR Reviews",
    description: "Pull requests awaiting your review across tracked repositories.",
    requiredConnectors: [{ provider: "github", optional: false }],
    requiredUserDataBuckets: ["github_prs"],
    defaultSettings: { caps: 2 },
    allowedCardTypes: ["github_review"]
  },
  github_mentions: {
    id: "github_mentions",
    label: "GitHub Direct Mentions",
    description: "Comments and discussions where you were @mentioned.",
    requiredConnectors: [{ provider: "github", optional: false }],
    requiredUserDataBuckets: ["github_mentions"],
    defaultSettings: { caps: 3 },
    allowedCardTypes: ["github_review", "link_open"]
  },
  jira_tasks: {
    id: "jira_tasks",
    label: "Jira Blockers",
    description: "Critical Jira tickets assigned to you or marked as blockers.",
    requiredConnectors: [{ provider: "jira", optional: false }],
    requiredUserDataBuckets: ["jira_tasks"],
    defaultSettings: { caps: 3 },
    allowedCardTypes: ["jira_open"]
  },
  ai_news_delta: {
    id: "ai_news_delta",
    label: "AI News Highlights",
    description: "The latest developments in AI and tech since your last briefing.",
    requiredConnectors: [{ provider: "rss", optional: true }],
    requiredUserDataBuckets: ["news_items"],
    defaultSettings: { caps: 3, filter_keywords: [] },
    allowedCardTypes: ["link_open"]
  },
  newsletters_digest: {
    id: "newsletters_digest",
    label: "Curated Newsletters",
    description: "Summaries of your subscribed industry newsletters.",
    requiredConnectors: [{ provider: "google", optional: true }], 
    requiredUserDataBuckets: ["newsletters"],
    defaultSettings: { caps: 2 },
    allowedCardTypes: ["link_open"]
  },
  focus_plan: {
    id: "focus_plan",
    label: "Daily Focus Plan",
    description: "Synthesized goals and blocked time for deep work.",
    requiredConnectors: [], 
    requiredUserDataBuckets: ["goals"],
    defaultSettings: { duration_hours: 2 },
    allowedCardTypes: ["link_open"]
  },
  watchlist_alerts: {
    id: "watchlist_alerts",
    label: "Watchlist Alerts",
    description: "Price movements and alerts for your tracked assets.",
    requiredConnectors: [], 
    requiredUserDataBuckets: ["watchlist"],
    defaultSettings: { caps: 2 },
    allowedCardTypes: ["link_open"]
  }
};
