# Briefing Selector - Acceptance Tests

This document outlines the validation steps for the "Briefing Selector" enhancement in the **Your Brief** tab.

## Pre-requisites
1. Ensure `list-history` Edge Function is updated to support `include_archived`.
2. Generate at least 3 briefings (mix of manual and scheduled if possible) using the **Today** tab.

## Test 1: Initial Load & Default Selection
1. Navigate to the **Your Brief** tab (`/brief`).
2. **Expected:** The dropdown menu should show the most recent briefing as the selected item.
3. **Expected:** All tabs (Summary, Key Insights, Grounding Sources, Transcript) should display data corresponding to this latest briefing.

## Test 2: Historical Selection
1. Click the briefing selector dropdown.
2. **Expected:** A list of briefings appears, sorted by date (newest first).
3. Select an older briefing from the list.
4. **Expected:** The UI should show a brief "Syncing nodes..." or skeleton state.
5. **Expected:** All content tabs should update to match the selected briefing.
6. **Expected:** Clicking "Play Selected" should navigate to `/today` with the correct `script_id` and `job_id` in the URL.

## Test 3: Persistence (localStorage)
1. Select a specific historical briefing.
2. Refresh the browser page.
3. **Expected:** The page should reload with that same historical briefing still selected (reading from `localStorage`).

## Test 4: Archive & Auto-Switch
1. Select the current latest briefing.
2. Click the **Archive** button.
3. **Expected:** A success toast appears.
4. **Expected:** The archived briefing is removed from the active view.
5. **Expected:** The selector should automatically switch to the next available non-archived briefing.

## Test 5: Include Archived Toggle
1. Toggle the "Include Archived" switch to ON.
2. **Expected:** The dropdown list should now show archived briefings (marked with a line-through or dimmed styling).
3. Select an archived briefing.
4. **Expected:** The content loads correctly, and the title shows an "(ARCHIVED)" tag.

## Test 6: Deep Linking
1. Copy the URL of a specific briefing (e.g., `/brief?script_id=...`).
2. Open this URL in a new tab or paste it into the address bar.
3. **Expected:** The app should load and automatically select that specific briefing if it exists and belongs to you.
