/**
 * Computes a stable idempotency key for an action.
 * hash(user_id + provider + action_type + JSON.stringify(payload))
 */
export async function computeIdempotencyKey(
  userId: string,
  provider: string,
  actionType: string,
  payload: Record<string, unknown>
): Promise<string> {
  const input = `${userId}:${provider}:${actionType}:${JSON.stringify(payload, Object.keys(payload).sort())}`;
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
