import { assertEquals, assertNotEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { computeAvatarAssetKey, computeBrollAssetKey } from "../supabase/functions/_shared/assetKey.ts";

Deno.test("Milestone 8C: asset keys are deterministic", async () => {
    const avatarParams = {
        dialogue: " Hello World  ",
        personaTitle: "Executive",
        provider: "fal"
    };
    
    const key1 = await computeAvatarAssetKey(avatarParams);
    const key2 = await computeAvatarAssetKey(avatarParams);
    
    assertEquals(key1, key2, "Same inputs must produce same key");
    // Verify trimming
    const key3 = await computeAvatarAssetKey({ ...avatarParams, dialogue: "Hello World" });
    assertEquals(key1, key3, "Trimming should ensure stability");
});

Deno.test("Milestone 8C: different inputs change keys", async () => {
    const key1 = await computeAvatarAssetKey({ dialogue: "a", personaTitle: "p", provider: "f" });
    const key2 = await computeAvatarAssetKey({ dialogue: "b", personaTitle: "p", provider: "f" });
    const key3 = await computeAvatarAssetKey({ dialogue: "a", personaTitle: "other", provider: "f" });
    
    assertNotEquals(key1, key2, "Dialogue change should change key");
    assertNotEquals(key1, key3, "Persona change should change key");
});

Deno.test("Milestone 8C: b-roll keys are deterministic", async () => {
    const brollParams = {
        prompt: "A beautiful sunrise",
        aspectRatio: "16:9",
        provider: "runware"
    };
    
    const key1 = await computeBrollAssetKey(brollParams);
    const key2 = await computeBrollAssetKey(brollParams);
    
    assertEquals(key1, key2);
});
