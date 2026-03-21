import { assertEquals, assertNotEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { computePlanHash } from "../supabase/functions/_shared/planHash.ts";

Deno.test("Milestone 8B: plan hash is deterministic", async () => {
    const plans = [
        { segment_kind: "intro", title: "Welcome", grounding_source_ids: ["a"], facts: { f: 1 } },
        { segment_kind: "news", title: "News", grounding_source_ids: ["b"], facts: { f: 2 } }
    ];
    
    const hash1 = await computePlanHash(plans);
    const hash2 = await computePlanHash(plans);
    
    assertEquals(hash1, hash2, "Same plans must produce same hash");
});

Deno.test("Milestone 8B: plan items order does not affect grounding ID hash", async () => {
    const plans1 = [
        { segment_kind: "news", grounding_source_ids: ["a", "b"], facts: {} }
    ];
    const plans2 = [
        { segment_kind: "news", grounding_source_ids: ["b", "a"], facts: {} }
    ];
    
    const hash1 = await computePlanHash(plans1);
    const hash2 = await computePlanHash(plans2);
    
    assertEquals(hash1, hash2, "Grounding IDs order should be stabilized");
});

Deno.test("Milestone 8B: fact changes change hash", async () => {
    const plans1 = [
        { segment_kind: "news", facts: { title: "Old" } }
    ];
    const plans2 = [
        { segment_kind: "news", facts: { title: "New" } }
    ];
    
    const hash1 = await computePlanHash(plans1);
    const hash2 = await computePlanHash(plans2);
    
    assertNotEquals(hash1, hash2, "Different facts must produce different hash");
});
