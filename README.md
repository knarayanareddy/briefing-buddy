# My Morning Brief — AI Executive Briefing Cockpit

> Transform raw data feeds into a cinematic, grounded, actionable daily briefing — with voice interaction, agentic verification, and narrated video playback.

🌐 **Live Demo**: [mymorningbriefer.lovable.app](https://mymorningbriefer.lovable.app)

---

## What It Does

My Morning Brief aggregates your data sources (email, calendar, GitHub, news, stocks, weather, Slack) and synthesizes them into a multi-segment **video briefing** — narrated, cited, and actionable. Think of it as your personal AI news anchor that knows your priorities.

### Key Capabilities

- 🎬 **Cinematic Briefings** — AI-generated multi-segment video with avatar presenter, b-roll imagery, and narrated dialogue
- 🔗 **Grounded Intelligence** — Every claim cites a `synced_item`; hallucinated sources are rejected at validation time
- 🎙️ **Voice Barge-In** — Pause playback mid-briefing, ask "What's the key risk here?", get a cited answer, then resume
- 🔍 **Deep Dive Agent** — Click into any segment for an agentic fact-check with tool traces and verdicts
- ⚡ **Agentic Actions** — AI proposes actions (create GitHub issue, send Slack message); you approve before execution
- 🔊 **ElevenLabs Narration** — Professional TTS with caching; falls back to Web Speech API
- 📊 **10 Briefing Modules** — Weather, Calendar, Inbox Triage, GitHub PRs, GitHub Mentions, AI News, Newsletters, Focus Plan, Watchlist Alerts, Jira Blockers
- 🔒 **Zero-Trust Security** — RLS on all tables, encrypted connector tokens (AES-GCM), PII masking before LLM calls, idempotent action execution

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Briefing  │  │Connectors│  │ Builder  │  │  Voice Overlay    │  │
│  │ Player    │  │Dashboard │  │ (Profiles│  │  (Barge-in Q&A)   │  │
│  │ + Actions │  │ + Health │  │ +Modules)│  │  + Deep Dive      │  │
│  └─────┬────┘  └────┬─────┘  └────┬─────┘  └────────┬──────────┘  │
│        │            │             │                  │              │
└────────┼────────────┼─────────────┼──────────────────┼──────────────┘
         │            │             │                  │
    ┌────▼────────────▼─────────────▼──────────────────▼────┐
    │              EDGE FUNCTIONS (Deno)                      │
    │  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │
    │  │generate-    │  │sync-*        │  │deep-dive-run │  │
    │  │script       │  │(rss/github/  │  │briefing-voice│  │
    │  │(planner →   │  │ calendar/    │  │tts-scene     │  │
    │  │ realizer →  │  │ gmail/stocks/│  │actions-*     │  │
    │  │ validator)  │  │ weather/     │  │              │  │
    │  │             │  │ slack)       │  │              │  │
    │  └──────┬──────┘  └──────┬──────┘  └──────┬───────┘  │
    │         │                │                │           │
    │  ┌──────▼────────────────▼────────────────▼───────┐   │
    │  │  orqClient (PII mask → retry → fallback)       │   │
    │  └──────────────────────┬─────────────────────────┘   │
    │                         │                              │
    └─────────────────────────┼──────────────────────────────┘
                              │
                 ┌────────────▼────────────┐
                 │  Lovable AI Gateway     │
                 │  (Gemini / GPT-5)       │
                 └─────────────────────────┘
    ┌─────────────────────────────────────────────────────┐
    │                  DATABASE (Postgres)                  │
    │  synced_items │ briefing_scripts │ actions            │
    │  deep_dive_runs │ tts_audio_cache │ connector_*      │
    │  rendered_segments │ render_jobs │ briefing_profiles  │
    │  ─────────────────────────────────────────────────    │
    │  RLS: auth.uid() = user_id on all user tables        │
    │  Vault: connector_secrets (AES-GCM encrypted)        │
    │  Cron: pg_cron + pg_net for scheduled sync           │
    └─────────────────────────────────────────────────────┘
```

---

## End-to-End Demo Flow

1. **Sign up / Sign in** → redirected to `/today` (Today page)
2. **Configure connectors** → `/connectors`: add RSS feeds, connect GitHub (OAuth), connect Google (OAuth), connect Slack (OAuth), set weather location, add stock tickers
3. **Create a briefing profile** → `/your-brief`: name it, enable modules (Weather, Calendar, News, GitHub PRs, Stocks, etc.), customize settings per module
4. **Generate briefing** → `/today`: select profile → "Synthesize" → watch the AI planner + realizer produce segments (cached if data unchanged via plan-hash)
5. **Render video** → click "Render" → Fal.ai generates avatar videos, Runware generates b-roll imagery, segments assemble into a playable briefing
6. **Play briefing** → click Play; navigate segments with timeline; view action cards per segment
7. **Voice barge-in** → click mic FAB → ask "What's the key risk here?" → see cited answer → click Resume
8. **Deep dive** → expand right panel on any segment → click "Start Deep Dive" → see agent trace timeline + verdict
9. **Execute action** → on an action card, click "Approve" → "Execute" → GitHub issue created / Slack message posted
10. **Narrated mode** → toggle narration → ElevenLabs audio plays per segment (cached after first play)
11. **Share** → generate a share link with optional expiry; recipients see read-only briefing

---

## Connectors

| Connector | Auth Method | Data Synced |
|-----------|-------------|-------------|
| **RSS** | Feed URLs (no auth) | News articles from configured feeds |
| **GitHub** | OAuth 2.0 (custom app) | PRs, mentions, issues, repo activity |
| **Google** | OAuth 2.0 (custom app) | Calendar events, Gmail inbox |
| **Slack** | OAuth 2.0 (custom app) | Channel messages, DMs |
| **Weather** | Open-Meteo (free, no key) | Temperature, conditions, forecast |
| **Stocks** | Yahoo Finance (free) | Price movements, watchlist alerts |

---

## Briefing Modules

| Module | Description | Required Connector |
|--------|-------------|--------------------|
| Local Weather | Current conditions & forecast | Weather (auto) |
| Today's Meetings | Upcoming calendar events | Google (optional) |
| Inbox Triage | High-priority unread emails | Google |
| GitHub PR Reviews | PRs awaiting your review | GitHub |
| GitHub Mentions | Issues/comments where you're @mentioned | GitHub |
| AI News Highlights | Latest AI/tech developments | RSS (optional) |
| Curated Newsletters | Industry newsletter summaries | Google (optional) |
| Daily Focus Plan | Synthesized goals & deep work blocks | None |
| Watchlist Alerts | Stock price movements | None |
| Jira Blockers | Critical tickets & blockers | Jira |

---

## Safety & Security Model

### Grounding
- Every briefing segment **must** cite `grounding_source_id` values from the planner's allowed list
- `validateSegmentGrounding()` rejects hallucinated source references
- Evidence Drawer shows the actual `synced_items` row behind each citation

### Human-in-the-Loop Actions
- AI **proposes** actions (e.g., "Create GitHub issue for this PR")
- User must **approve** before execution
- Server-side execution with `idempotency_key` prevents duplicates

### Idempotency
- `actions.idempotency_key` has a unique constraint
- Re-executing an approved action returns the cached result
- Plan-hash caching: identical data → same briefing (no wasted LLM calls)

### Secret Isolation
- All API keys stored in edge function environment (never in browser)
- Connector tokens encrypted with AES-GCM via `CONNECTOR_SECRET_KEY`
- PII masked before any LLM call or log entry
- Row-Level Security (RLS) on all user-facing tables

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite 5, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion |
| **Backend** | Lovable Cloud (Postgres + Edge Functions + Storage + RLS) |
| **AI** | Lovable AI Gateway (Gemini 2.5 Flash / GPT-5) via `orqClient` routing |
| **Avatar Video** | Fal.ai (talking-head generation with 30s timeout) |
| **B-Roll Imagery** | Runware (AI image generation) |
| **Voice Recognition** | Web Speech API (browser-native) |
| **Narration** | ElevenLabs Turbo v2.5 with server-side caching |
| **OAuth** | Custom GitHub, Google, Slack OAuth apps |
| **Routing** | React Router v6 |
| **State** | TanStack Query + React state |

---

## Project Structure

```
src/
├── components/
│   ├── today/          # Briefing player, timeline, controls, voice overlay
│   ├── builder/        # Profile builder (modules, settings, preview)
│   ├── connectors/     # Connector cards, config modals, health dashboard
│   ├── layout/         # App shell, sidebar, header
│   ├── share/          # Share dialog
│   └── ui/             # shadcn/ui primitives
├── pages/              # Route pages (Today, Auth, Connectors, etc.)
├── hooks/              # Custom hooks (narration, voice chat, mobile)
├── lib/                # API client, module catalog, utilities
└── integrations/       # Auto-generated Supabase client & types

supabase/functions/
├── generate-script/    # Briefing planner → realizer → validator
├── start-render/       # Kicks off video rendering pipeline
├── render-worker/      # Processes individual segment renders
├── job-status/         # Polls render progress, unsticks segments
├── sync-*/             # Data sync per connector (rss, github, calendar, etc.)
├── deep-dive-run/      # Agentic fact-check with tool traces
├── actions-*/          # Create, approve, execute AI-proposed actions
├── elevenlabs-tts/     # TTS generation with caching
├── *-oauth-*/          # OAuth flows for GitHub, Google, Slack
└── _shared/            # Shared utilities (config, crypto, planner, etc.)
```

---

## Environment Variables

### Client-side (auto-managed)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

### Server-side Secrets
| Secret | Purpose |
|--------|---------|
| `INTERNAL_API_KEY` | Edge function auth |
| `CONNECTOR_SECRET_KEY` | AES-GCM encryption for connector tokens |
| `ELEVENLABS_API_KEY` | Text-to-speech narration |
| `FAL_KEY` | Avatar video generation |
| `OPENAI_API_KEY` | AI model access |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth app |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth app |
| `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET` | Slack OAuth app |
| `ORQ_API_KEY` | orq.ai routing (optional) |
| `OPENCLAW_API_KEY` | OpenClaw integration (optional) |

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/judging-proof.md](docs/judging-proof.md) | Rubric proof pack — feature-to-criteria mapping |
| [docs/your-brief.md](docs/your-brief.md) | Briefing profile configuration guide |
| [docs/brief-selector.md](docs/brief-selector.md) | Brief selector UX documentation |
| [docs/history-and-playback.md](docs/history-and-playback.md) | History and playback features |
| [docs/scheduling.md](docs/scheduling.md) | Scheduled briefing setup |
| [docs/share-links.md](docs/share-links.md) | Share link generation and access |
| [docs/dev-notes.md](docs/dev-notes.md) | Developer notes and architecture decisions |
| [SECURITY.md](SECURITY.md) | Security model and responsible disclosure |

---

## Quick Start

```bash
# 1. Clone and install
npm install

# 2. Environment is auto-configured by Lovable Cloud
# VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY are pre-set

# 3. Set server-side secrets via Lovable Cloud → Secrets:
# INTERNAL_API_KEY, ELEVENLABS_API_KEY, FAL_KEY, CONNECTOR_SECRET_KEY
# GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
# GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
# SLACK_CLIENT_ID, SLACK_CLIENT_SECRET

# 4. Run locally
npm run dev
```

---

*Built for hackathon demo — 2026 Project Spark / My Morning Brief*
