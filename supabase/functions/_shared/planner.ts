import { AssembledUserData } from "./userData.ts";
import { getModule, ModuleId } from "./moduleManifest.ts";

export type SegmentKind =
  | "weather"
  | "calendar_event"
  | "news_digest"
  | "news_item"
  | "github_digest"
  | "github_pr"
  | "email_digest"
  | "email_item"
  | "focus_plan"
  | "connector_missing"
  | "wrap";

export interface SegmentPlan {
  plan_id: string;
  segment_kind: SegmentKind;
  title: string;
  facts: Record<string, any>;
  grounding_source_ids: string[];
  ui_action_suggestion: {
    is_active: boolean;
    card_type: string;
    title: string;
    action_button_text: string;
    action_payload: string;
  };
  b_roll_hint: string | null;
}

/** Resolve the effective cap for a module, respecting profile overrides. */
function resolveCap(moduleId: ModuleId, moduleSettings: Record<string, any>): number {
  const mod = getModule(moduleId);
  if (!mod) return 3;
  const override = moduleSettings[moduleId]?.caps;
  if (typeof override === "number" && Number.isInteger(override) && override > 0) return override;
  return mod.defaults.maxSegments;
}

/** Build a disabled action card with no payload. */
const INACTIVE_ACTION = (cardType: string): SegmentPlan["ui_action_suggestion"] => ({
  is_active: false,
  card_type: cardType,
  title: "",
  action_button_text: "",
  action_payload: "",
});

/** 
 * Validates if a card type is allowed for a given module according to manifest.
 * Returns the card type if allowed, or "link_open" as a safe fallback.
 */
function getAllowedCardType(moduleId: ModuleId, requestedType: string): string {
  const mod = getModule(moduleId);
  if (!mod) return "link_open";
  if (mod.allowedCardTypes.includes(requestedType as any)) return requestedType;
  console.warn(`Module ${moduleId} tried to use unauthorized card type ${requestedType}. Falling back.`);
  return "link_open";
}

export interface PlannerInput {
  enabledModules: ModuleId[];
  moduleSettings: Record<string, any>;
  userData: AssembledUserData;
}

/**
 * Fully deterministic module-driven planner.
 */
export function planSegments({ enabledModules, moduleSettings, userData }: PlannerInput): SegmentPlan[] {
  const plans: SegmentPlan[] = [];
  const allGroundingIds: string[] = [];

  const emit = (plan: SegmentPlan) => {
    plans.push(plan);
    plan.grounding_source_ids.forEach(id => {
        if (!allGroundingIds.includes(id)) allGroundingIds.push(id);
    });
  };

  // We iterate through enabledModules which should already be sorted by manifest order (or user preference)
  for (const modId of enabledModules) {
    const mod = getModule(modId);
    if (!mod || mod.availability === "coming_soon") continue;

    const cap = resolveCap(modId, moduleSettings);

    // ── WEATHER ─────────────────────────────────────────────────────────────
    if (modId === "weather" && userData.weather && userData.weather.length > 0) {
      const w = userData.weather[0];
      emit({
        plan_id: `weather_${w.source_id}`,
        segment_kind: "weather",
        title: "Local Weather Update",
        facts: { location: w.location, summary: w.summary, temp_f: w.current_temp_f, high_f: w.forecast_high_f, low_f: w.forecast_low_f },
        grounding_source_ids: [w.source_id],
        ui_action_suggestion: {
          is_active: true,
          card_type: getAllowedCardType("weather", "weather_widget"),
          title: `${w.location}: ${w.current_temp_f}°F`,
          action_button_text: "View Forecast",
          action_payload: `https://www.google.com/search?q=weather+${encodeURIComponent(w.location)}`,
        },
        b_roll_hint: `Panoramic view of ${w.location}, ${w.summary}`,
      });
    }

    // ── CALENDAR ────────────────────────────────────────────────────────────
    if (modId === "calendar_today" && userData.calendar_events && userData.calendar_events.length > 0) {
      userData.calendar_events.slice(0, cap).forEach(ev => {
        emit({
          plan_id: `cal_${ev.source_id}`,
          segment_kind: "calendar_event",
          title: "Upcoming Meeting",
          facts: { title: ev.title, start: ev.start_time_iso, end: ev.end_time_iso, location: ev.location || null },
          grounding_source_ids: [ev.source_id],
          ui_action_suggestion: ev.join_url
            ? { is_active: true, card_type: getAllowedCardType("calendar_today", "calendar_join"), title: ev.title, action_button_text: "Join Call", action_payload: ev.join_url }
            : INACTIVE_ACTION("calendar_join"),
          b_roll_hint: null,
        });
      });
    }

    // ── AI NEWS ─────────────────────────────────────────────────────────────
    if (modId === "ai_news_delta" && userData.news_items && userData.news_items.length > 0) {
      const topNews = userData.news_items.slice(0, cap);
      const topIds = topNews.map(n => n.source_id);

      // Digest
      emit({
        plan_id: `news_digest_${topIds[0]}`,
        segment_kind: "news_digest",
        title: "AI & Tech News Digest",
        facts: { count: topNews.length, headlines: topNews.map(n => n.title) },
        grounding_source_ids: topIds,
        ui_action_suggestion: INACTIVE_ACTION("link_open"),
        b_roll_hint: "Abstract data stream, tech headlines",
      });

      // Individual items
      const sortedNews = [...topNews].sort((a, b) => (b.priority ? 1 : 0) - (a.priority ? 1 : 0));
      sortedNews.forEach((news, idx) => {
        emit({
          plan_id: `news_${news.source_id}`,
          segment_kind: "news_item",
          title: news.title,
          facts: { title: news.title, source: news.source_name, snippet: news.snippet, url: news.url, published: news.published_time_iso },
          grounding_source_ids: [news.source_id],
          ui_action_suggestion: news.url
            ? { is_active: true, card_type: getAllowedCardType("ai_news_delta", "link_open"), title: news.title.slice(0, 50), action_button_text: "Read Article", action_payload: news.url }
            : INACTIVE_ACTION("link_open"),
          b_roll_hint: idx === 0 ? `Concept visual: ${news.title.slice(0, 40)}` : null,
        });
      });
    }

    // ── GITHUB PRs ──────────────────────────────────────────────────────────
    if (modId === "github_prs" && userData.github_prs && userData.github_prs.length > 0) {
      const topPRs = userData.github_prs.slice(0, cap);
      const topIds = topPRs.map(pr => pr.source_id);

      emit({
        plan_id: `gh_digest_${topIds[0]}`,
        segment_kind: "github_digest",
        title: "GitHub Pull Request Overview",
        facts: { count: topPRs.length, repos: [...new Set(topPRs.map(pr => pr.repo))] },
        grounding_source_ids: topIds,
        ui_action_suggestion: INACTIVE_ACTION("github_review"),
        b_roll_hint: "Code review screen, git activity graph",
      });

      const sortedPRs = [...topPRs].sort((a, b) => (a.priority ? -1 : 1) || 0); // Watchlist items first
      sortedPRs.forEach(pr => {
        emit({
          plan_id: `gh_${pr.source_id}`,
          segment_kind: "github_pr",
          title: `PR: ${pr.title.slice(0, 50)}`,
          facts: { repo: pr.repo, title: pr.title, author: pr.author_display, status: pr.status, url: pr.url },
          grounding_source_ids: [pr.source_id],
          ui_action_suggestion: pr.url
            ? { is_active: true, card_type: getAllowedCardType("github_prs", "github_review"), title: `${pr.repo}: ${pr.title.slice(0, 30)}`, action_button_text: "Review PR", action_payload: pr.url }
            : INACTIVE_ACTION("github_review"),
          b_roll_hint: null,
        });
      });
    }

    // ── EMAIL ───────────────────────────────────────────────────────────────
    if (modId === "inbox_triage" && userData.emails_unread && userData.emails_unread.length > 0) {
      const topEmails = userData.emails_unread.slice(0, cap);
      const topIds = topEmails.map(e => e.source_id);

      emit({
        plan_id: `email_digest_${topIds[0]}`,
        segment_kind: "email_digest",
        title: "Inbox Highlights",
        facts: { count: topEmails.length, senders: topEmails.map(e => e.from_display) },
        grounding_source_ids: topIds,
        ui_action_suggestion: INACTIVE_ACTION("email_reply"),
        b_roll_hint: null,
      });

      const sortedEmails = [...topEmails].sort((a, b) => (b.priority ? 1 : 0) - (a.priority ? 1 : 0));
      sortedEmails.forEach(email => {
        emit({
          plan_id: `email_${email.source_id}`,
          segment_kind: "email_item",
          title: email.subject,
          facts: { from: email.from_display, subject: email.subject, snippet: email.snippet },
          grounding_source_ids: [email.source_id],
          ui_action_suggestion: email.email_id
            ? { is_active: true, card_type: getAllowedCardType("inbox_triage", "email_reply"), title: `From: ${email.from_display}`, action_button_text: "Open Email", action_payload: `https://mail.google.com/mail/u/0/#inbox/${email.email_id}` }
            : INACTIVE_ACTION("email_reply"),
          b_roll_hint: null,
        });
      });
    }

    // ── JIRA ────────────────────────────────────────────────────────────────
    if (modId === "jira_tasks" && userData.jira_tasks && userData.jira_tasks.length > 0) {
        const topJira = userData.jira_tasks.slice(0, cap);
        topJira.forEach(task => {
            emit({
                plan_id: `jira_${task.source_id}`,
                segment_kind: "wrap", // reuse wrap or add jira_item
                title: `Jira: ${task.key}`,
                facts: { key: task.key, title: task.title, status: task.status, priority: task.priority },
                grounding_source_ids: [task.source_id],
                ui_action_suggestion: {
                    is_active: true,
                    card_type: getAllowedCardType("jira_tasks", "link_open"),
                    title: task.key,
                    action_button_text: "View Issue",
                    action_payload: task.url,
                },
                b_roll_hint: null,
            });
        });
    }

    // ── FOCUS PLAN ──────────────────────────────────────────────────────────
    if (modId === "focus_plan") {
      const actionableItems = plans
        .filter(p => p.ui_action_suggestion.is_active)
        .slice(0, 3);

      if (actionableItems.length > 0) {
        const focusIds = actionableItems.flatMap(p => p.grounding_source_ids).slice(0, 3);
        emit({
          plan_id: "focus_plan_segment",
          segment_kind: "focus_plan",
          title: "Today's Top Actions",
          facts: { action_count: actionableItems.length, top_actions: actionableItems.map(p => p.title) },
          grounding_source_ids: focusIds,
          ui_action_suggestion: INACTIVE_ACTION("link_open"),
          b_roll_hint: null,
        });
      }
    }

    // Connector Check (if missing)
    if (mod.requiredConnectors.length > 0 && userData.connector_status) {
        for (const req of mod.requiredConnectors) {
            const status = userData.connector_status.find(s => s.provider === req.provider);
            if (status && !status.connected) {
                emit({
                    plan_id: `missing_${modId}_${req.provider}`,
                    segment_kind: "connector_missing",
                    title: `${mod.name} Data Missing`,
                    facts: { provider: req.provider, message: status.message },
                    grounding_source_ids: [status.source_id],
                    ui_action_suggestion: INACTIVE_ACTION("link_open"),
                    b_roll_hint: null,
                });
            }
        }
    }
  }

  // ── FINAL WRAP ─────────────────────────────────────────────────────────────
  if (plans.length > 0) {
    const wrapGrounding = [...new Set(allGroundingIds)].slice(0, 5);
    emit({
      plan_id: "wrap_segment",
      segment_kind: "wrap",
      title: "Briefing Complete",
      facts: { total_segments: plans.length },
      grounding_source_ids: wrapGrounding,
      ui_action_suggestion: INACTIVE_ACTION("link_open"),
      b_roll_hint: null,
    });
  }

  return plans;
}

export function planBriefing(userData: AssembledUserData): SegmentPlan[] {
  const enabledModules: ModuleId[] = ["weather", "ai_news_delta", "github_prs", "calendar_today", "inbox_triage", "focus_plan"];
  return planSegments({ enabledModules, moduleSettings: {}, userData });
}
