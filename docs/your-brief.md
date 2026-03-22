# YourBrief - Acceptance Tests

This document outlines the end-to-end acceptance tests to verify the functionality of the YourBrief tab.

## Pre-requisites
1. Ensure your local database has been migrated. Run `supabase db push` or `supabase migration up` to ensure the `briefing_artifacts` table and `archived` boolean on `briefing_scripts` exist.
2. Have at least one connected and synced data source (e.g., RSS, GitHub).
3. Have a valid OpenAI API key in your `.env` or Supabase secrets (`OPENAI_API_KEY`).

## Test 1: Empty State
1. Open the **Your Brief** tab with no generated briefings.
2. **Expected:** You should see the "No Briefings Yet" placeholder state.
3. **Expected:** Clicking "Initialize Briefing" should navigate you to the `/today` (Builder) tab.

## Test 2: Generate and View
1. Go to the `/today` tab and generate a new briefing.
2. Once rendering is complete (or queued), navigate to the **Your Brief** tab.
3. **Expected:** The UI should automatically load the most recent briefing.
4. **Expected:** The title, generation time, and segment count should be accurate.
5. **Expected:** The `SUMMARY` tab should display an AI-generated executive summary (2 paragraphs).
6. **Expected:** The `KEY INSIGHTS` tab should display bulleted insights with clickable segment and source tags.
7. **Expected:** The `GROUNDING SOURCES` tab should list the unique sources used to generate the briefing.
8. **Expected:** The `TRANSCRIPT` tab should display the full dialogue with visual cues for external dependencies.

## Test 3: Tab Navigation & Playback
1. Click the "Play Latest" button or click on the video player mockup.
2. **Expected:** You should be navigated back to `/today?script_id=...` to watch the active video stream.
3. Click on the Source tags within Key Insights or Transcript.
4. **Expected:** It should automatically switch to the Grounding Sources tab.

## Test 4: Actions (Distribute & Archive)
1. Click **Distribute**.
2. **Expected:** A toast notification should appear confirming the Replay Link was copied to your clipboard.
3. Click **Archive**.
4. **Expected:** The briefing should be immediately removed from the view. If there are older unarchived briefings, it will load the next most recent one. Otherwise, it will return to the Empty State.

## Test 5: Hallucination Prevention (Edge Case)
1. Generate a briefing but intentionally use a revoked or invalid `OPENAI_API_KEY`.
2. Navigate to **Your Brief**.
3. **Expected:** The app should not crash. It will fall back to a deterministic summary (extracting the first sentences of early segments) and deterministic insights.
