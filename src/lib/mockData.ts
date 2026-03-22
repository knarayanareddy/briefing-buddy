import brollMorning from "@/assets/broll-morning-overview.mp4.asset.json";
import brollSecurity from "@/assets/broll-security-ops.mp4.asset.json";
import brollMarket from "@/assets/broll-market-briefing.mp4.asset.json";
import brollDev from "@/assets/broll-dev-workspace.mp4.asset.json";
import brollAI from "@/assets/broll-ai-neural.mp4.asset.json";
import brollCalendar from "@/assets/broll-calendar-plan.mp4.asset.json";

export const mockVideoUrls = [
  brollMorning.url,
  brollSecurity.url,
  brollMarket.url,
  brollDev.url,
  brollAI.url,
  brollCalendar.url,
];

export const mockUserPreferences = {
  persona: "Cyberpunk Executive",
  focus_areas: ["Security", "AI Trends", "Markets", "Engineering", "Schedule"],
};

export const mockUserData = {
  calendar: [
    { id: "cal_1", title: "Quarterly Security Review", time: "09:00 AM" },
    { id: "cal_2", title: "Board Strategy Session", time: "11:00 AM" },
    { id: "cal_3", title: "Sync with Hackathon Team", time: "02:00 PM" },
  ],
  tasks: [
    { id: "task_1", title: "Review RAG Pipeline Docs", status: "pending" },
    { id: "task_2", title: "Update GitHub Secret Redaction", status: "urgent" },
    { id: "task_3", title: "Approve Q4 Budget Forecast", status: "pending" },
  ],
  slack_mentions: [
    { id: "slack_1", from: "Sarah (Hackathon Org)", message: "The render job is failing for segment 4." },
    { id: "slack_2", from: "Dev Ops Channel", message: "Prod deploy completed — 3 services updated." },
  ],
};

export const mockScriptJson = {
  script_metadata: {
    persona_applied: "Executive Briefer",
    total_estimated_segments: 10,
  },
  timeline_segments: [
    {
      segment_id: 1,
      segment_type: "opening",
      dialogue: "Good morning, Executive. It's 7:14 AM — skies are clear, markets are pre-positioning, and your perimeter is stable. Here's what demands your attention today.",
      grounding_source_id: "system_status",
      runware_b_roll_prompt: "Aerial dawn cityscape with golden light on glass towers",
      ui_action_card: {
        is_active: true, card_type: "summary", title: "Morning Situation Report",
        action_button_text: "View Full Brief", action_payload: "/your-brief",
        metadata: { threat_level: "LOW", systems_online: 47, alerts_pending: 3 },
      },
    },
    {
      segment_id: 2,
      segment_type: "security",
      dialogue: "Two critical vulnerabilities were flagged overnight in the authentication layer. The SOC team has patched CVE-2026-1847 but CVE-2026-1903 requires your sign-off before deployment to production.",
      grounding_source_id: "security_feed",
      runware_b_roll_prompt: "Cybersecurity operations center with monitoring screens",
      ui_action_card: {
        is_active: true, card_type: "approval", title: "Approve Security Patch",
        action_button_text: "Review & Approve", action_payload: "https://security.internal/patch/CVE-2026-1903",
        metadata: { severity: "CRITICAL", cve: "CVE-2026-1903", affected_services: 3 },
      },
    },
    {
      segment_id: 3,
      segment_type: "market",
      dialogue: "S&P futures are up 0.7% on strong earnings from the semiconductor sector. Your portfolio exposure to AI infrastructure is performing well — up 2.3% pre-market. The Q4 budget forecast is ready for your review.",
      grounding_source_id: "market_feed",
      runware_b_roll_prompt: "Conference room with financial charts on large display",
      ui_action_card: {
        is_active: true, card_type: "link_open", title: "Q4 Budget Forecast",
        action_button_text: "Open Forecast", action_payload: "https://finance.internal/q4-forecast",
        metadata: { sp500_change: "+0.7%", portfolio_change: "+2.3%", sector: "AI Infrastructure" },
      },
    },
    {
      segment_id: 4,
      segment_type: "ai_insights",
      dialogue: "Your neural model training run completed at 3:47 AM. Accuracy improved to 94.2%, up from 91.8% in the previous iteration. The team recommends promoting this model to staging for A/B testing this week.",
      grounding_source_id: "ai_pipeline",
      runware_b_roll_prompt: "Neural network visualization with flowing data particles",
      ui_action_card: {
        is_active: true, card_type: "approval", title: "Promote Model to Staging",
        action_button_text: "Approve Promotion", action_payload: "https://ml.internal/models/v4.2/promote",
        metadata: { model_version: "v4.2", accuracy: "94.2%", improvement: "+2.4%" },
      },
    },
    {
      segment_id: 5,
      segment_type: "engineering",
      dialogue: "Three pull requests need your review — the RAG pipeline refactor from Chen, the auth middleware update from Priya, and the monitoring dashboard overhaul. Sarah also flagged a render pipeline failure that needs triage.",
      grounding_source_id: "github_feed",
      runware_b_roll_prompt: "Developer workspace with code editors and GitHub notifications",
      ui_action_card: {
        is_active: true, card_type: "link_open", title: "Review Pull Requests",
        action_button_text: "Open GitHub", action_payload: "https://github.com/org/repo/pulls",
        metadata: { pending_prs: 3, authors: ["Chen", "Priya", "DevOps"] },
      },
    },
    {
      segment_id: 6,
      segment_type: "email_item",
      dialogue: "Priority email from the VP of Sales — the Meridian Health deal is moving to final negotiation. They need the revised pricing deck by end of day. Legal has already signed off on the terms.",
      grounding_source_id: "email_feed",
      runware_b_roll_prompt: "Executive reviewing documents on a tablet in a modern office",
      ui_action_card: {
        is_active: true, card_type: "link_open", title: "Meridian Health Deal",
        action_button_text: "View Email", action_payload: "https://mail.internal/thread/meridian",
        metadata: { sender: "VP Sales", deal_value: "$2.4M", deadline: "Today EOD" },
      },
    },
    {
      segment_id: 7,
      segment_type: "partnerships",
      dialogue: "The Anthropic partnership integration is on track. Their API team confirmed sandbox access for next week. Meanwhile, the Datadog observability pilot exceeded expectations — 40% reduction in mean time to detection.",
      grounding_source_id: "partnerships_feed",
      runware_b_roll_prompt: "Two teams collaborating in a glass-walled conference room",
      ui_action_card: {
        is_active: true, card_type: "link_open", title: "Partnership Dashboard",
        action_button_text: "View Status", action_payload: "/connectors",
        metadata: { active_partnerships: 4, pending_review: 1 },
      },
    },
    {
      segment_id: 8,
      segment_type: "team_updates",
      dialogue: "Two new hires start Monday in the platform engineering team. The Q3 hackathon results are in — Team Phoenix won with an automated incident response system that reduced MTTR by 60%.",
      grounding_source_id: "team_feed",
      runware_b_roll_prompt: "Diverse team celebrating around a whiteboard with diagrams",
      ui_action_card: {
        is_active: true, card_type: "link_open", title: "Hackathon Results",
        action_button_text: "View Winners", action_payload: "https://internal.wiki/hackathon-q3",
        metadata: { winning_team: "Phoenix", improvement: "60% MTTR reduction" },
      },
    },
    {
      segment_id: 9,
      segment_type: "ops_alert",
      dialogue: "Infrastructure alert: the EU-West region experienced a 12-minute latency spike at 4:22 AM. Root cause identified as a misconfigured load balancer. The SRE team has applied a fix and is monitoring.",
      grounding_source_id: "ops_feed",
      runware_b_roll_prompt: "Server room with blinking status lights and monitoring dashboards",
      ui_action_card: {
        is_active: true, card_type: "link_open", title: "Incident Report",
        action_button_text: "View Postmortem", action_payload: "https://status.internal/incidents/EU-2026-0322",
        metadata: { region: "EU-West", duration: "12 min", status: "Resolved" },
      },
    },
    {
      segment_id: 10,
      segment_type: "closing",
      dialogue: "Your first meeting is the Security Review at 9 AM, followed by the Board Strategy Session at 11. I've blocked 30 minutes of focus time before each. That's your briefing — execute with precision.",
      grounding_source_id: "cal_1",
      runware_b_roll_prompt: "Executive calendar on tablet with coffee, morning planning",
      ui_action_card: {
        is_active: true, card_type: "calendar_join", title: "Join Security Review",
        action_button_text: "Join at 9:00 AM", action_payload: "https://zoom.us/j/123456789",
        metadata: { next_meeting: "Security Review", time: "09:00 AM", prep_time: "30 min" },
      },
    },
  ],
};
