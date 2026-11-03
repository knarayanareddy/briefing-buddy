# briefing-buddy — remediation plan

Plan for findings in [REVIEW.md](REVIEW.md), pinned to `46ab418dc9efa26a61c1bea921994ec474f44662`. Every command or test below is **future planned work**, not an observed success. Preserve current checks and thresholds; do not add real credentials to fixtures or logs.

## Phase 0 — reproduce and inventory

**Entry:** owner supplies an isolated environment and permits installation/testing. **Exit:** both failed jobs are reproduced or their exact CI logs explain why not; baseline and target versions recorded.

### T-01 — CI baseline (BB-02, BB-05, BB-06)
**Prerequisites:** pinned checkout, Node 22 and Deno 2, access to historical run logs. **Paths:** `.github/workflows/ci.yml`, `package.json`, `package-lock.json`, `tests/import_map.json`.
1. Read both failed-step logs and record their exact errors, revision and environment; do not infer a cause from the step name.
2. In isolation, compare manifest and lockfile, then plan `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:deno` as separate checks; record exit codes and environment.
3. Inventory remote Deno imports and resolution/lock strategy, preserving the test map's existing exact Supabase 2.99.3 mapping while separately checking transitive dependencies and deployment resolution; reconcile documented React, Router and Vite versions against the verified lock and successful build.

**Deliverable:** baseline report and compatibility/dependency decision. **Verification:** another engineer can reproduce the failures or see a documented environmental blocker. **DoD:** [ ] both failure causes evidenced or explicitly unresolved; [ ] exact versions and all check outcomes recorded; [ ] docs match validated versions.

## Phase 1 — connector correctness and security

**Entry:** T-01 baseline recorded; test Supabase and fake GitHub transport available. **Exit:** callback failure cases cannot return success, and production authorization policy is explicit.

### T-02 — durable GitHub connection (BB-01)
**Prerequisites:** T-01; owner decision on transaction/retry semantics. **Paths:** `supabase/functions/github-oauth-callback/index.ts`, `supabase/functions/_shared/crypto.ts`; tests at a proposed callback integration-test path.
1. Trace all Supabase results and provider HTTP status handling; define which partial states can exist and what compensation or database transaction is feasible without retaining plaintext tokens.
2. Check every write and cleanup result; persist connector data consistently, surface sanitized failures, and return success only after durable state is confirmed. Define safe retries where token exchange cannot be repeated.
3. Exercise the actual handler with a fake provider and isolated database: force each write and cleanup failure, provider error, and success; inspect stored encrypted data and observable response.

**Deliverable:** corrected callback and failure-path tests. **Verification:** deliberately ignore a write error and confirm a test fails; successful response must correspond to usable persisted state. **DoD:** [ ] no forced write error returns success; [ ] partial-state recovery documented and tested; [ ] token and raw provider errors do not appear in logs.

### T-03 — separate preview and enforce trust boundaries (BB-03; preventive security)
**Prerequisites:** T-01; owner approves preview policy and isolated two-user accounts. **Paths:** `src/App.tsx`, `src/lib/devMode.ts`, `src/pages/Auth.tsx`, `supabase/functions/_shared/auth.ts`, `supabase/migrations/`.
1. Decide whether preview is shipped; if retained, isolate it from real tenant data and clearly mark simulated behavior. Do not use localStorage as an authorization boundary.
2. Trace representative connector, action, share and sync endpoints through JWT/internal-key checks and effective RLS; review server-side ownership, replay/expiry and least privilege before changing policy.
3. Add integration tests for anonymous requests, user A requesting user B data, invalid internal key, valid scoped operations and preview requests; inspect responses and database effects. Review feed URL SSRF and untrusted source text entering model prompts with targeted adversarial cases.

**Deliverable:** authorization matrix, preview policy and boundary tests. **Verification:** deliberately remove a user predicate or RLS restriction in isolation and show the cross-tenant negative test fails. **DoD:** [ ] preview cannot grant real privileges; [ ] tested endpoints deny cross-tenant access; [ ] unreviewed endpoints and injection defenses remain explicitly tracked.

## Phase 2 — meaningful automation and UX

**Entry:** T-02 and T-03 behavior agreed; baseline available. **Exit:** CI covers the changed seams and accessibility checks are observed, not merely configured.

### T-04 — reliable gates and accessible controls (BB-02, BB-04, BB-06)
**Prerequisites:** T-01 through T-03. **Paths:** `.github/workflows/ci.yml`, `package.json`, `src/pages/Auth.tsx`, `src/components/layout/AppHeader.tsx`; proposed integration and browser test paths.
1. Correct the evidenced install and Deno failures without disabling checks; choose and verify reproducible, integrity-protected dependency resolution.
2. Associate the email label with its input; name icon-only controls and verify their purpose; check focus order, narrow layouts, observer fallback and reduced motion.
3. Add a dedicated isolated integration job for critical handler and RLS cases, keeping credentials out of untrusted PR contexts; add browser assertions for accessible names and keyboard navigation.

**Deliverable:** green reproducible gates and UX changes. **Verification:** independently run the actual CI commands and browser checks; deliberately remove the label association and confirm its test fails. **DoD:** [ ] both CI jobs pass on the candidate SHA; [ ] meaningful negative controls fail when broken; [ ] keyboard and accessibility tree reviewed.

## Phase 3 — operations and independent acceptance

**Entry:** T-04 passes; owner approves hosting, secrets and recovery scope. **Exit:** release and restore are observed in a nonproduction environment and open risks are signed off.

### T-05 — release, scheduling and recovery (preventive operations)
**Prerequisites:** T-04; isolated Supabase project, provider sandbox credentials and owner-set RPO/RTO. **Paths:** `docs/scheduling.md`, `SECURITY.md`, `supabase/migrations/`; proposed release/runbook documentation.
1. Inventory deployed functions, migration order, secrets, cron schedules and permissions; establish secret rotation and provider spend alerts without recording secret values.
2. Document versioned release, migration compatibility, alerting and rollback, including how to pause cron and recover partially completed connector operations.
3. Back up representative isolated tenant data and encrypted credentials; restore into a separate project, verify ownership and decryption with authorized test keys, and measure recovery time and data loss.

**Deliverable:** tested operational runbook and restore evidence. **Verification:** independent operator performs the restore and a scheduled-job failure drill; record results and deviations. **DoD:** [ ] RPO/RTO measured against owner targets; [ ] restore and job alerts observed; [ ] rotation and rollback owners named.

## Dependencies and acceptance

| Order | Dependency | Gate |
|---|---|---|
| T-01 | Owner test environment | Reproducible baseline |
| T-02, T-03 | T-01 and isolated services | Correct persistence and tenant boundaries |
| T-04 | T-01–T-03 | CI and accessibility evidence |
| T-05 | T-04 and owner approval | Observed recovery and release drill |

**Production acceptance:** [ ] independent reviewer replays T-02/T-03 negative controls; [ ] candidate SHA passes all required checks; [ ] provider sandbox, authorization and share flows observed; [ ] restored data and cron alert verified; [ ] remaining untested surfaces and risk owners documented.

**Owner approvals:** production preview behavior, OAuth scopes, actual hosting, data retention, key rotation, costs, RPO/RTO and any migration affecting customer data. Release only the reviewed candidate with a reversible deployment plan; pause jobs and roll back application/functions on regression, and use a tested forward migration or restore for incompatible database changes. Never assume a code rollback reverses stored data.
