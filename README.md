# Project Spark — AI Executive Briefing Cockpit

> Transform raw data feeds into a cinematic, grounded, actionable daily briefing — with voice interaction, agentic verification, and narrated playback.

---

## Architecture at a Glance

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
    │              SUPABASE EDGE FUNCTIONS                   │
    │  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │
    │  │generate-    │  │sync-*        │  │deep-dive-run │  │
    │  │script       │  │(rss/github/  │  │briefing-voice│  │
    │  │(planner →   │  │ calendar/    │  │tts-scene     │  │
    │  │ realizer →  │  │ gmail/stocks/│  │actions-*     │  │
    │  │ validator)  │  │ weather)     │  │              │  │
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
    │                SUPABASE (Postgres)                   │
    │  synced_items │ briefing_scripts │ actions           │
    │  deep_dive_runs │ tts_audio_cache │ connector_*     │
    │  ─────────────────────────────────────────────────   │
    │  RLS: auth.uid() = user_id on all user tables       │
    │  Vault: connector_secrets (encrypted)               │
    │  Cron: pg_cron + pg_net for hourly sync             │
    └─────────────────────────────────────────────────────┘
```

## End-to-End Demo Flow

1. **Sign in** → redirected to `/brief` (Today page)
2. **Configure connectors** → `/connectors`: add RSS feeds, GitHub PAT, weather location, stock tickers → click "Sync Now" on each
3. **Create a briefing profile** → `/your-brief`: name it, enable modules (Weather, Calendar, News, GitHub PRs, Stocks), save
4. **Generate briefing** → `/brief`: select profile → "Generate" → watch segments populate (cached if data unchanged)
5. **Play briefing** → click Play; navigate segments with timeline; view action cards per segment
6. **Voice barge-in** → click mic FAB → ask "What's the key risk here?" → see cited answer → click Resume
7. **Deep dive** → expand right panel on any segment → click "Start Deep Dive" → see agent trace timeline + verdict
8. **Execute action** → on an action card, click "Approve" → "Execute" → GitHub issue created / Slack message posted
9. **Narrated mode** → toggle narration → ElevenLabs audio plays per segment (cached after first play)

## Safety Model

### Grounding
- Every briefing segment **must** cite `grounding_source_id` values from the planner's allowed list
- `validateSegmentGrounding()` rejects hallucinated source references
- Evidence Drawer shows the actual `synced_items` row behind each citation

### Human Approval
- AI **proposes** actions (e.g., "Create GitHub issue for this PR")
- User must **approve** before execution
- Server-side execution with `idempotency_key` prevents duplicates

### Idempotency
- `actions.idempotency_key` has a unique constraint
- Re-executing an approved action returns the cached result
- Plan-hash caching: identical data → same briefing (no wasted LLM calls)

### Secret Isolation
- All API keys in Edge Function env vars (never in browser)
- Connector tokens encrypted with `CONNECTOR_SECRET_KEY`
- PII masked before any LLM call or log entry

## Documentation

| Document | Description |
|---|---|
| [docs/judging-proof.md](docs/judging-proof.md) | Rubric proof pack — feature-to-criteria mapping with evidence |
| [docs/your-brief.md](docs/your-brief.md) | Briefing profile configuration guide |
| [docs/brief-selector.md](docs/brief-selector.md) | Brief selector UX documentation |
| [docs/history-and-playback.md](docs/history-and-playback.md) | History and playback features |
| [docs/scheduling.md](docs/scheduling.md) | Scheduled briefing setup |
| [docs/share-links.md](docs/share-links.md) | Share link generation and access |
| [docs/dev-notes.md](docs/dev-notes.md) | Developer notes and architecture decisions |
| [SECURITY.md](SECURITY.md) | Security model and responsible disclosure |

## Tech Stack

- **Frontend**: React 18, Vite 5, Tailwind CSS, shadcn/ui, Framer Motion
- **Backend**: Supabase (Postgres + Edge Functions + Storage + RLS)
- **AI**: Lovable AI Gateway (Gemini 3 Flash / GPT-5) via `orqClient` routing wrapper
- **Voice**: Web Speech API (recognition + synthesis)
- **Narration**: ElevenLabs Turbo v2.5 with caching
- **Connectors**: RSS, GitHub, Google (Calendar + Gmail), Weather (Open-Meteo), Stocks (Yahoo Finance), Slack

## Setup

```bash
# 1. Clone and install
npm install

# 2. Configure .env (auto-managed by Lovable Cloud)
# VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY are pre-set

# 3. Set server-side secrets (via Lovable Cloud > Secrets):
# INTERNAL_API_KEY, ELEVENLABS_API_KEY, FAL_KEY, LOVABLE_API_KEY (auto)

# 4. Run locally
npm run dev
```

---

*Built for hackathon demo. 2026 Project Spark.*
