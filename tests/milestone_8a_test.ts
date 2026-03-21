import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.test("Milestone 8A: rss_feed_state existence", async () => {
    const { data, error } = await supabase
        .from("rss_feed_state")
        .select("*")
        .limit(1);
    
    assertEquals(error, null, "Should be able to query rss_feed_state");
});

Deno.test("Milestone 8A: scheduled-sync protection", async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/scheduled-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
    });
    assertEquals(res.status, 401, "Should fail without internal key");
});
