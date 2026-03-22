# History and Playback Documentation

## Overview
This feature completes the cycle from generating a briefing (either manually or via the scheduled cron system) to securely viewing it later through an interactive deep-linked player.

## Implementation Details

### Database & Security
*   **render_jobs.user_id**: The `render_jobs` table now holds strict `user_id` lineage. Backfilled properly via migration `20260322100001_render_jobs_user_id.sql`.
*   **Edge Function Auth Checks**: Data access across `start-render`, `job-status`, `list-history`, and `get-briefing` rigorously verifies the `auth.user_id` mapping.
*   **Internal API Authenticity**: `start-render` and background agents securely traverse utilizing `x-user-id` authenticated against `x-internal-api-key`. No service details interact with the browser layer.

### Features
*   **Deep-Linked Player**: Hitting `/today?script_id={uuid}` or `/today?script_id={uuid}&job_id={uuid}` successfully loads historical data safely using Edge endpoint derivations.
*   **Idempotency**: Repeatedly clicking "Start Render" from any view simply returns the existing live processing `job_id`, ensuring credits are not blown on duplicated video queues.
*   **Real Latest Brief**: The `YourBrief` landing page dynamically populates against real histories, functioning as a true quick-jump dashboard.

---

## Acceptance Tests

### Test 1: Manual Generation Flow
1. Navigate to Today page. Disable Mock Mode if DEV controls are visible.
2. Click **Generate Script** and subsequently **Start Render**.
3. While the render handles the initial timeline, click the sidebar to navigate to **History**.
4. The briefing will appear labeled *queued* or *rendering*. Wait briefly or refresh.
5. Click **Open Player** on that item.
6. **Expected:** URL switches to `/today?script_id=...&job_id=...`. The visual layout restores instantly without regenerating, immediately pulling the existing Job state and resuming the active Render Poller if it hasn't finished yet.

### Test 2: Unrendered Scheduled Run
1. If your Schedule generator naturally queues scripts without `auto_render=true`, navigate to **History**.
2. Identify a historically scheduled item marked *No Render Job*.
3. Click **Start Render**.
4. **Expected:** An idempotent connection queues a fresh job cleanly, immediately navigating toward `/today?script_id=...&job_id=...` and booting up visual segments cleanly.

### Test 3: Unauthorized Identity Shield Check
1. Copy a successful `job_id` and `script_id` from your URL bar.
2. Log out, or switch profiles in an alternate browser.
3. Paste the URL.
4. **Expected:** Both the user context check locally and `get-briefing` remotely block data extraction. The visual interface should cleanly report: *Failed to load briefing: Script not found or access denied.*
