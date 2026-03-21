# Security Guidelines & Hardening

This document outlines the security architecture and operational practices for the Morning Briefing Bot.

## 1. Token Handling & Secrets
- **Encryption**: All connector tokens (GitHub, RSS, etc.) are encrypted server-side using AES-GCM.
- **Key Management**: The `CONNECTOR_SECRET_KEY` must be a cryptographically strong 32-byte key.
- **No Leaks Policy**: 
    - Secrets are decrypted only at the edge during synchronization.
    - `sanitize.ts` and `redactSecrets` utilities MUST be used in all error handlers.
    - Never log raw tokens or email bodies.

## 2. Audit Logging
- **Table**: `audit_events`
- **Scope**: Logs key actions (`generate_script`, `start_render`, `sync_*`, `set_connector_secret`).
- **Data Privacy**: Logs contain metadata only (counts, IDs, provider names). Strictly NO PII or secrets in metadata.

## 3. Rate Limiting & Quotas
- **Enforcement**: Per-user daily limits for script generation and media rendering.
- **Config**: Managed via `DAILY_GENERATE_LIMIT` and `DAILY_RENDER_LIMIT` environment variables.
- **Table**: `briefing_usage_limits` (tracks daily counts per `user_id`).

## 4. Row Level Security (RLS)
- All tables (`briefing_profiles`, `synced_items`, `reading_list`, `audit_events`, `briefing_usage_limits`) have strict RLS enabled.
- Users can ONLY read/write their own data.
- Service role is used only for background system tasks (e.g., rendering worker).

## 5. Incident Response
- **Monitoring**: Check `audit_events` for unusual spikes in `429` errors or failed syncs.
- **Revocation**: If a user's account is compromised, delete their `connector_secrets` entry to immediately invalidate edge function access to third-party APIs.
