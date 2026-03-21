/**
 * Builds a set of allowed grounding source IDs from user data.
 * @param userData The raw user data from the briefing request.
 * @returns A Set of valid source IDs.
 */
export function buildAllowedIds(userData: any): Set<string> {
  const allowedIds = new Set<string>();
  if (!userData) return allowedIds;

  // Walk through common data buckets (emails, calendar, tasks, docs, slack, etc.)
  for (const bucket in userData) {
    const items = userData[bucket];
    if (Array.isArray(items)) {
      items.forEach((item) => {
        if (item.id) allowedIds.add(String(item.id));
        if (item.source_id) allowedIds.add(String(item.source_id));
      });
    }
  }

  return allowedIds;
}

/**
 * Validates that all grounding_source_id tokens in segments exist in the allowed set.
 * Throws an error if any ID is invalid.
 */
export function validateGroundingIds(
  segments: any[],
  allowedIds: Set<string>
): void {
  segments.forEach((seg) => {
    const sourceIds = String(seg.grounding_source_id || "")
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (sourceIds.length === 0) {
      throw new Error(`Segment ${seg.segment_id} missing grounding_source_id`);
    }

    sourceIds.forEach((id) => {
      if (!allowedIds.has(id)) {
        throw new Error(
          `Invalid grounding_source_id '${id}' in segment ${seg.segment_id}`
        );
      }
    });
  });
}
