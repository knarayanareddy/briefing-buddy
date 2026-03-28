# Judging Proof Pack — Project Spark

> **60-second skim guide** mapping every implemented feature to the hackathon rubric.

---

## 1. Feature → Rubric Matrix

| Feature | Technical Depth | Impact | Originality | Demo Quality | Completeness |
|---|---|---|---|---|---|
| **Grounded briefing generation** (planner → realizer → validator) | Deterministic planner + LLM realizer + Zod schema validation + grounding ID enforcement | Reduces exec info-overload to a 2-min daily brief | Cinematic "newscast" format with action cards | Cached plan-hash skips re-gen; sub-5s on warm | End-to-end: data in → script → playback |
| **Voice barge-in Q&A** | Web Speech API + context-aware prompt injection + citation extraction | Ask follow-ups mid-briefing without context loss | "Interrupt your AI briefing" — no competitor does this | Pause → ask → cited answer → resume | Full loop with fallback if mic denied |
| **Agentic deep dive** (OpenClaw-style) | Tool-calling with `submit_analysis` schema; sanitized trace storage | One-click "verify this claim" on any segment | Trace timeline UI showing agent reasoning steps | Returns in <10s with verdict badge | Verify + Deep Dive modes; citations linked to evidence |
| **ElevenLabs narration** | SHA-256 text-hash cache key; Supabase Storage bucket; 15s timeout; base64 fallback | Cinematic audio briefing — hands-free consumption | Request-stitched multi-scene narration | Preloads next scene; cache hit = instant | `tts-scene` endpoint + `tts_audio_cache` table |
| **orq routing** | `orqClient.ts` wrapper: PII masking, retry-with-stricter-prompt, null-return fallback | Observability + guardrails for all LLM calls | Unified routing layer across 4 task types | Fallback ensures demo never breaks on AI failure | Covers: realize, repair, voice_chat, deep_dive, verify |
| **Action lifecycle** | Propose → approve → execute with idempotency_key; RLS on `actions` table | Briefing insights become executable actions | AI proposes, human approves, server executes | GitHub issue creation, Slack post | Full CRUD + status tracking |
| **Live connectors** | RSS/GitHub/Google Calendar/Gmail/Weather/Stocks sync into `synced_items` | Real data feeds into briefing — no stale content | Polling-based with connector health tracking | Sync status badges + last_sync_at | 7 providers; hourly cron via pg_cron |

---

## 2. Technical Depth Evidence

### 2.1 Grounding & Citation Integrity

- **Every segment** must cite `grounding_source_id` values from the planner's allowed list
- `validateSegmentGrounding()` rejects any ID not in the plan's `grounding_source_ids[]`
- `validateBriefingScript()` enforces Zod schema: sequential segment IDs, valid `card_type` enum, segment count match
- Evidence Drawer resolves `source_id` → `synced_items` row with title/summary/URL
- Files: `_shared/grounding.ts`, `_shared/briefingSchema.ts`, `generate-script/index.ts`

### 2.2 RLS + Vault + Idempotency

| Table | RLS Policy | Isolation |
|---|---|---|
| `briefing_scripts` | `auth.uid() = user_id` (SELECT) | User can only read own scripts |
| `actions` | `auth.uid() = user_id` (ALL) | Full CRUD scoped to owner |
| `synced_items` | `auth.uid() = user_id` (SELECT) | Read-only for user |
| `deep_dive_runs` | `auth.uid() = user_id` (SELECT, INSERT) | User can create and read own |
| `tts_audio_cache` | `auth.uid() = user_id` (SELECT, INSERT) | User-scoped audio cache |
| `connector_secrets` | No anon/authenticated grants | Service-role only — secrets never reach client |
| `cron_secrets` | `REVOKE ALL FROM anon, authenticated` | Postgres-only access for cron jobs |

- **Idempotency**: `actions.idempotency_key` (unique) prevents duplicate execution
- **Vault**: Connector tokens stored in `connector_secrets.encrypted_payload`; decrypted only server-side via `CONNECTOR_SECRET_KEY`
- **Service-role isolation**: All Edge Functions use `SUPABASE_SERVICE_ROLE_KEY` for writes; client never gets write access to `synced_items`, `briefing_scripts`, etc.

### 2.3 orq Routing / Guardrails / Masking

- **Wrapper**: `_shared/orqClient.ts` exposes `orqCall()` and `orqGenerateJSON()`
- **PII masking**: Emails → `[EMAIL]`, Bearer tokens → `Bearer [TOKEN]`, API keys → `[REDACTED_SECRET]`
- **Retry strategy**: `orqGenerateJSON` attempts primary call → on parse failure, retries with appended "IMPORTANT: Return ONLY valid JSON" instruction → on second failure, returns `null` so caller uses fallback
- **Rate limit propagation**: 429/402 errors thrown immediately (no retry burn)
- **Routed tasks**: `realize_segment`, `repair_segment`, `voice_chat`, `deep_dive`, `verify_claim`
- **Fallback**: `realizer.ts` falls back to direct Lovable AI Gateway fetch if orqClient returns null

### 2.4 ElevenLabs Caching

- **Cache key**: `(user_id, voice_id, SHA-256(text), format)` — unique constraint in `tts_audio_cache`
- **Storage**: `tts-audio` Supabase Storage bucket with user-folder RLS
- **Flow**: Check cache → hit: return signed URL (1h TTL) → miss: call ElevenLabs (15s timeout) → upload to storage → insert cache row → return signed URL
- **Fallback**: If storage upload fails (bucket missing), returns inline base64 audio
- **Model**: `eleven_turbo_v2_5` for low latency; voice: George (JBFqnCBsd6RMkjVDRZzb)

### 2.5 Voice Barge-In Architecture

- **No master API key exposure**: `realtime-token` endpoint creates session tokens server-side
- **Context grounding**: `briefing-context` fetches nearby segment dialogue + evidence for the current scene
- **Voice chat**: `briefing-voice-chat` sends grounded context + user question to AI, returns answer + `cited_sources[]`
- **Commands**: Transcript parsed for "pause", "resume", "repeat", "skip" with confirmation UX
- **Fallback**: Web Speech API (`SpeechRecognition` + `speechSynthesis`) if WebRTC unavailable

---

## 3. What We Cut and Why

| Feature | Status | Rationale |
|---|---|---|
| **WebRTC Realtime transport** | Stubbed (Web Speech fallback active) | OpenAI Realtime API requires per-session billing; Web Speech gives 90% of the UX for free |
| **Notion OAuth + sync** | Card visible, sync not implemented | Notion API requires per-workspace approval; punted to avoid demo-day auth failures |
| **Google Drive file monitoring** | Not started | Requires `drive.readonly` scope upgrade; risks re-consent prompt mid-demo |
| **Webhook-based sync** | Deferred | Polling is simpler and sufficient for hourly data freshness at hackathon scale |
| **Multi-tenant admin dashboard** | Out of scope | Single-user MVP — RLS already enforces isolation if we add users |
| **Video avatar rendering** | Renders via Fal.ai when configured | Expensive per-segment; demo uses b-roll images + TTS narration instead |
| **Custom voice cloning** | Not started | Requires ElevenLabs Professional plan; using stock "George" voice |

**Scope philosophy**: We built fewer features deeply rather than many features shallowly. Every implemented feature has error handling, fallbacks, caching, and RLS.

---

## 4. Security Summary

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Browser     │────▶│  Edge Func   │────▶│  AI Gateway     │
│  (no keys)   │     │  (auth+RLS)  │     │  (LOVABLE_API)  │
└─────────────┘     └──────┬───────┘     └─────────────────┘
                           │
                    ┌──────▼───────┐
                    │  Supabase DB │
                    │  (RLS + SRK) │
                    └──────────────┘
```

- **Zero client-side secrets**: All API keys live in Deno.env (Edge Functions)
- **PII never logged**: `orqClient.maskPII()` strips emails/tokens before any telemetry
- **Connector secrets encrypted**: AES via `CONNECTOR_SECRET_KEY`, stored in `connector_secrets`
- **Cron auth**: `cron_secrets` table with `REVOKE ALL FROM anon, authenticated`
