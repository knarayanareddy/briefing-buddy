import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

/**
 * Computes a SHA-256 hash for a given string payload.
 */
async function sha256(payload: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(payload);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Key for avatar video: dialogue + persona + voice + provider/model.
 */
export async function computeAvatarAssetKey(params: {
  dialogue: string;
  personaTitle: string;
  provider: string;
}): Promise<string> {
  const payload = JSON.stringify({
    d: params.dialogue.trim(),
    p: params.personaTitle,
    pr: params.provider,
    v: "v1" // internal versioning for the hashing logic itself
  });
  return await sha256(payload);
}

/**
 * Key for B-roll image: prompt + dimensions + provider/model.
 */
export async function computeBrollAssetKey(params: {
  prompt: string;
  aspectRatio: string;
  provider: string;
}): Promise<string> {
  const payload = JSON.stringify({
    pr: params.prompt.trim(),
    ar: params.aspectRatio,
    prov: params.provider,
    v: "v1"
  });
  return await sha256(payload);
}
