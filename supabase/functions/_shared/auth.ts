import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Config } from "./config.ts";

export type AuthResult =
  | { ok: true; mode: "jwt" | "internal_key"; user_id?: string }
  | { ok: false; status: number; body: { error: string; detail?: string } };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Constant-time string comparison for secret keys. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Unified authorization helper for Edge Functions.
 * Supports Supabase Auth (JWT) and server-to-server internal-api-key mode.
 *
 * Internal-key mode only works when INTERNAL_API_KEY is configured AND the
 * caller presents the exact same value. There is intentionally NO hardcoded
 * fallback key: an unauthenticated request without a valid JWT always 401s.
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

  // 2. Internal Key Mode (server-to-server: cron, scheduled jobs, operators).
  //    Requires INTERNAL_API_KEY to be configured — no hardcoded bypass key.
  if (internalKey && config.INTERNAL_API_KEY && timingSafeEqual(internalKey, config.INTERNAL_API_KEY)) {
    const xUserId = req.headers.get("x-user-id");
    if (xUserId) {
      if (!UUID_REGEX.test(xUserId)) {
        return { ok: false, status: 400, body: { error: "Invalid x-user-id format" } };
      }
      return { ok: true, mode: "internal_key", user_id: xUserId };
    }

    const previewUserId = req.headers.get("x-preview-user-id");
    if (previewUserId) {
      if (!UUID_REGEX.test(previewUserId)) {
        return { ok: false, status: 400, body: { error: "Invalid x-preview-user-id format" } };
      }
      return { ok: true, mode: "internal_key", user_id: previewUserId };
    }

    // Fallback for non-user-scoped endpoints (e.g. system preflight)
    return { ok: true, mode: "internal_key" };
  }

  // 3. Unauthorized
  return {
    ok: false,
    status: 401,
    body: { error: "unauthorized" },
  };
}
