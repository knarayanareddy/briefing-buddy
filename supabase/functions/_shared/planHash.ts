import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { encode as hexEncode } from "https://deno.land/std@0.168.0/encoding/hex.ts";

/**
 * Creates a stable, minimal representation of a segment plan for hashing.
 * We only include fields that affect the deterministic content of the realize step.
 */
export function createStablePlanPayload(plans: any[]): string {
  const minimal = plans.map(p => ({
    kind: p.segment_kind,
    sids: [...(p.grounding_source_ids || [])].sort(),
    // For facts, we only hash keys and stable metadata (titles/URLs/times)
    // We avoid hashing large text snippets if possible, but the prompt says 
    // "facts (already sanitized) but only the essential fields (title/url/times), not long snippets"
    facts: Object.entries(p.facts || {}).reduce((acc: any, [k, v]) => {
      if (typeof v === "string" && v.length > 200) {
        // Truncate for stable hashing of large facts if needed, 
        // but usually facts are already extracted summaries.
        acc[k] = v.slice(0, 100); 
      } else {
        acc[k] = v;
      }
      return acc;
    }, {}),
    action: p.ui_action_suggestion ? {
      t: p.ui_action_suggestion.title,
      b: p.ui_action_suggestion.action_button_text
    } : null
  }));

  return JSON.stringify(minimal);
}

/**
 * Computes a SHA-256 hash of the segment plans.
 */
export async function computePlanHash(plans: any[]): Promise<string> {
  const payload = createStablePlanPayload(plans);
  const msgUint8 = new TextEncoder().encode(payload);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  
  // Convert buffer to hex string
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}
