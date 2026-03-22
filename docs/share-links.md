# Public Share Links Testing & Architecture

## Security and Cryptography
The public share links leverage a stateless Web Crypto HMAC-SHA256 implementation coupled with stateful database assertions. 
- Tokens are of the form `base64url(JSON) + "." + base64url(Signature)`.
- Replay/expiry attacks are mitigated by validating the embedded `exp` timestamp combined with a database-enforced `expired_at` and `revoked_at` column checks.
- Internal secrets, connector metadata, and API keys are strictly guarded and omitted from all public endpoint responses (`get-shared-briefing`). This is achieved using deep cloning and explicit object deletions before serialization to the public perimeter.

## Testing Checklist

### 1) Create a Rendered Briefing
- **Pre-requisite:** Ensure you have logged in as a valid user and initiated a complete rendering job either from `Today` or the `BriefingBuilder`.
- The rendering job status in the Database must be 'complete' with generated video endpoints.

### 2) Generate Share Link
- Navigate to the `Today` or `History` tab.
- Click the **Share** button.
- Modify the expiry (e.g., set to 1 Hour) and leave "Include Transcript" toggled on.
- Click **Create Public Link**. Verify that an absolute URL containing `/share/<token>` is generated. Copied successfully.

### 3) Public Access (Incognito)
- Open an incognito browser window (to ensure no JWT or authentication headers are attached).
- Paste the share URL.
- **Expected Result:** The briefing player should load with the "Shared Briefing" header. 
- The video timeline should automatically stitch the segments together, properly rendering subtitles if the transcript was enabled. Action items should strictly be disabled.
- **Data Leak Check:** Verify through browser DevTools that the network response from `get-shared-briefing` contains no raw properties for `connectors`, `grounding_source_id`, or `user_data`.

### 4) Revoke the Share
- Return to your authenticated browser session.
- (For direct database manipulation if UI management is pending): Update the row inside `briefing_shares` where `id` matches the generated share, setting `revoked_at = now()`.
- Return to the incognito window and refresh.
- **Expected Result:** A 403 "Access Revoked" red warning screen.

### 5) Expiration
- Generate a brand new link with Expiry set to 1 hour.
- Intervene in Supabase directly and mock the `expires_at` column for that particular share row to a timestamp safely in the past (e.g., yesterday).
- Access the link in your incognito window.
- **Expected Result:** A 410 "Share link expired" or mathematical HMAC error indicating the JWT stamp fails validation against the window. The endpoint drops the connection gracefully.
