# Public Share Links — Architecture & Testing

## How sharing actually works

Share links are **opaque UUID tokens backed by database state** — not stateless
signed tokens. (`supabase/functions/_shared/shareToken.ts` contains an unused
HMAC prototype; it is not wired into the live flow.)

### Create — `create-share-link`
- Requires auth (JWT or internal key). **Ownership check**: the caller must own
  the `script_id` (404 otherwise), preventing IDOR against arbitrary scripts.
- Accepts `expires_in_hours` (the ShareDialog sends this) or `expires_in_days`
  (legacy callers). Defaults to 7 days.
- Persists `include_transcript` / `allow_action_cards` toggles on the row.
- Returns `{ share_id, token, share_url, expires_at }` where `share_url` is a
  **relative path** (`/share/<uuid>`). The client prefixes
  `window.location.origin`, so the link always points at the current app host.
- The app route is `/share/:token` (`src/App.tsx`); the backend never emits the
  legacy `/today?t=…` URL.

### Read — `get-shared-briefing?t=<token>` (public, no auth)
- Status codes: `400` missing token, `404` invalid/revoked/not found,
  `410` expired, `500` internal.
- Response shape (matches `SharedBrief.tsx`):
  ```json
  {
    "script": { "id", "title", "persona", "created_at",
                "script_json": { "timeline_segments": [...] } },
    "render": { "id", "status", "updated_at",
                "segments": [ { "segment_id", "status", "video_url",
                                "broll_url", "dialogue", "segment_type" } ] },
    "share":  { "expires_at", "scope", "created_at", "view_count" }
  }
  ```
- **Render segments come from `rendered_segments`** (keyed by `job_id`), never
  from `render_jobs.segments` — that jsonb column is never written by the
  pipeline.
- Public payload hygiene: `grounding_source_id` and `runware_b_roll_prompt` are
  stripped from timeline segments; `dialogue` is nulled when the share was
  created with `allow_transcript: false`; `ui_action_card` is nulled unless
  `allow_action_cards: true`.
- View tracking: best-effort `increment_share_view` RPC (migration
  `20261103120000`) which only counts live (unrevoked, unexpired) shares.

### Revoke — `revoke-share-link`
- Sets `revoked_at` scoped by owner (`user_id`), returns `404` when no live row
  matched. Revocation is enforced on every subsequent read.

### Schema — migration `20261103120000_share_links_fix.sql`
- Adds `revoked_at`, `view_count`, `last_viewed_at`, `include_transcript`,
  `allow_action_cards`; backfills and drops the legacy `revoked` boolean;
  creates `increment_share_view`.

## Manual testing checklist

1. **Create a rendered briefing** — log in, generate, and complete a render job
   (job status `complete` with video URLs).
2. **Generate share link** — Share button → set expiry (e.g. 1 hour), toggle
   "Include Transcript" → create. Expect an absolute URL containing
   `/share/<token>` (origin + relative path) and a success toast.
3. **Public access (incognito)** — open the link logged out:
   - Header shows the briefing title and an "Expires" badge.
   - Video stage + timeline load; subtitles appear when transcript was enabled.
   - **Data leak check** (DevTools → `get-shared-briefing` response): no
     `grounding_source_id`, `runware_b_roll_prompt`, connector config, or
     `user_data` anywhere in the payload.
4. **Revoke** — authenticated, set `revoked_at = now()` (or call
   `revoke-share-link`), refresh incognito → `404 Invalid share link.`
5. **Expiration** — backdate `expires_at` to yesterday, refresh incognito →
   `410 This share link has expired.`
6. **Status codes** — confirm `200` for a live link; `404`/`410` never arrive
   as `200 { error: … }`.
