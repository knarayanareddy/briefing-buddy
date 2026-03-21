/**
 * Unified shape for assembled user data from various connectors.
 * This is the input format for the Deterministic Planner.
 */
export interface ConnectorStatus {
  source_id: string;         // e.g. "connector_github_status" — stable, deterministic
  provider: "rss" | "github" | "google" | "jira" | "calendar";
  connected: boolean;
  last_sync_time_iso: string | null;
  status: "active" | "missing" | "error";
  message: string;           // code-generated, never from user input
}

export interface AssembledUserData {
  calendar_events?: Array<{
    source_id: string;
    title: string;
    start_time_iso: string;
    end_time_iso: string;
    location?: string;
    join_url?: string;
  }>;
  emails_unread?: Array<{
    source_id: string;
    from_display: string;
    subject: string;
    snippet: string;
    received_time_iso: string;
    email_id: string;
    thread_id: string;
    priority?: boolean;
  }>;
  github_prs?: Array<{
    source_id: string;
    repo: string;
    title: string;
    url: string;
    author_display: string;
    status: string;
    updated_time_iso: string;
    priority?: boolean;
  }>;
  jira_tasks?: Array<{
    source_id: string;
    key: string;
    title: string;
    status: string;
    priority: string;
    url: string;
  }>;
  news_items?: Array<{
    source_id: string;
    title: string;
    source_name: string;
    url: string;
    published_time_iso: string;
    snippet: string;
    tags?: string[];
    priority?: boolean;
  }>;
  weather?: Array<{
    source_id: string;
    location: string;
    summary: string;
    current_temp_f: number;
    forecast_high_f: number;
    forecast_low_f: number;
  }>;
  connector_status: ConnectorStatus[];
}
