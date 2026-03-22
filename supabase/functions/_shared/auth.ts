import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Config } from "./config.ts";

export type AuthResult =
  | { ok: true; mode: "jwt" | "internal_key"; user_id?: string }
  | { ok: false; status: number; body: { error: string; detail?: string } };

/**
 * Unified authorization helper for Edge Functions.
 * Supports Supabase Auth (JWT) and internal-api-key fallback.
 */
export async function authorizeRequest(
  req: Request,
  config: Config
): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");
  const internalKey = req.headers.get("x-internal-api-key");

  // 1. Try JWT Mode
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const supabase = createClient(
        config.SUPABASE_URL!,
        Deno.env.get("SUPABASE_ANON_KEY") ?? "", // Use anon key for auth check
        { global: { headers: { Authorization: authHeader } } }
      );
      
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (user && !error) {
        return { ok: true, mode: "jwt", user_id: user.id };
      }
      // If JWT failed but we have it, we don't immediately fail; we might still have a valid internal key
    } catch (e) {
      console.warn("JWT auth check threw an error:", e);
    }
  }

  // 2. Try Internal Key Mode (Hackathon/Legacy)
  if (internalKey && config.INTERNAL_API_KEY) {
    if (internalKey === config.INTERNAL_API_KEY) {
      return { ok: true, mode: "internal_key" };
    }
  }

  // 3. Unauthorized
  return {
    ok: false,
    status: 401,
    body: { error: "unauthorized" },
  };
}
