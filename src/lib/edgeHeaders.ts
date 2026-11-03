import { supabase } from "@/integrations/supabase/client";

/**
 * Build headers for Supabase Edge Function calls.
 *
 * - With a session: sends the user's JWT (normal authenticated mode).
 * - Without a session: sends an *explicitly configured* demo key
 *   (`VITE_DEMO_INTERNAL_KEY`) so unauthenticated preview mode only works
 *   when the operator deliberately opted in on both client and server.
 *   There is intentionally no hardcoded fallback key.
 */
export async function buildEdgeHeaders(
  extra: Record<string, string> = {}
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    ...extra,
  };

  const { data } = await supabase.auth.getSession();
  const session = data.session;

  if (session) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  } else {
    const demoAuthMode = import.meta.env.VITE_DEMO_AUTH_MODE || "internal_key";
    const demoKey = import.meta.env.VITE_DEMO_INTERNAL_KEY;
    if (demoAuthMode === "internal_key" && demoKey) {
      headers["x-internal-api-key"] = demoKey;
      headers["x-preview-user-id"] =
        import.meta.env.VITE_DEMO_USER_ID || "00000000-0000-0000-0000-000000000000";
    }
  }

  return headers;
}
