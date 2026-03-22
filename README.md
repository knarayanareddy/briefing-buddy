# Morning Briefing Bot (Refactored)

A production-grade, secure AI orchestration system for generating personalized "Executive Briefings". Built for hackathon reliability with strict schema stability and zero-hallucination guardrails.

## 🌟 Features

- **Secure Orchestration**: All AI calls and provider interactions happen server-side (Supabase Edge Functions).
- **Modern App Shell**: Consistent sidebar navigation and header with integrated profile/auth management.
- **3-Pane Briefing Builder**: Advanced layout for profile selection, module configuration, and real-time briefing preview.
- **Connectors & Health**: Centralized hub for RSS, GitHub, and Gmail connectors with health monitoring and secure secret management.
- **Developer Mode**: Seamless UI gating for debug panels and raw metadata, with cross-tab state synchronization.
- **Authentication Resilience**: Robust fallback to Email OTP sign-in and Dev Mode bypass for unauthenticated previews.
- **AppSec Hardening**:
  - **Vault-based Secrets**: PATs and keys are stored in Supabase Vault, never exposed to the UI.
  - **RLS Lockdown**: Tables restricted to Service Role only.
  - **Deep Sanitization**: Automatic redaction of secrets and PII from user data and logs.

## 🏗️ Architecture

- **Frontend**: React, Vite, Tailwind, Shadcn/UI (Radix primitives).
- **State Management**: Zero-config `localStorage` sync via custom events for Developer Mode.
- **Database**: Supabase (PostgreSQL) with RLS enabled.
- **Edge Functions**:
  - `generate-script`: LLM orchestration with deep sanitization.
  - `start-render`: Sequential media rendering pipeline with error isolation.
  - `sync-required-connectors`: Automated fetching and health checking for third-party data.
  - `set-connector-secret`: Secure write-only endpoint for storing encrypted tokens.

## 🚀 Setup & Deployment

### 1. Environment Variables
Copy `.env.example` to `.env` and fill in:
- `OPENAI_API_KEY`: For script generation.
- `FAL_KEY`: For avatar video generation.
- `RUNWARE_API_KEY`: For B-roll images.
- `INTERNAL_API_KEY`: Secure key for Edge Function authentication.

### 2. Database Migrations
Run the migrations in `supabase/migrations/` to set up the schema and lock down RLS.

### 3. Edge Functions
Deploy via Supabase CLI:
```bash
supabase functions deploy generate-script --no-verify-jwt
supabase functions deploy start-render --no-verify-jwt
supabase functions deploy job-status --no-verify-jwt
```

```

## 🧪 Development Flow
1. **Mock Mode**: Enabled by default in the UI. Uses local `mockData.ts` to simulate the full flow without API credits.
2. **Live Mode**: Requires your `INTERNAL_API_KEY` to be entered in the UI.

## 🛡️ Security Notes
- **Never committed**: `.env` is ignored by git.
- **Sanitization**: All user data is passed through `sanitizeDeep()` which truncates long fields and redacts common secret patterns.
- **Validation**: If the LLM generates an invalid grounding source ID or non-sequential segments, the system rejects the output (Zero-Hallucination).

## 📄 Repository Link
Verified: [github.com/knarayanareddy/morning-briefing-bot-46f5a482](https://github.com/knarayanareddy/morning-briefing-bot-46f5a482)
