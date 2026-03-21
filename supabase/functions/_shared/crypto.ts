export async function deriveKeyFromEnv(secretB64: string): Promise<CryptoKey> {
  const rawKey = Uint8Array.from(atob(secretB64), c => c.charCodeAt(0));
  if (rawKey.length !== 32) {
    throw new Error("CONNECTOR_SECRET_KEY must be exactly 32 bytes (base64 encoded).");
  }
  return await crypto.subtle.importKey(
    "raw",
    rawKey,
    "AES-GCM",
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptString(plaintext: string, keyB64: string): Promise<{ ciphertextB64: string, ivB64: string }> {
  const key = await deriveKeyFromEnv(keyB64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertextBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  
  const ciphertextB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer)));
  const ivB64 = btoa(String.fromCharCode(...iv));
  return { ciphertextB64, ivB64 };
}

export async function decryptString(ciphertextB64: string, ivB64: string, keyB64: string): Promise<string> {
  const key = await deriveKeyFromEnv(keyB64);
  const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(ciphertextB64), c => c.charCodeAt(0));
  
  const decryptedBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decryptedBuffer);
}
