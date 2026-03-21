export async function sha256Hex(input: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

export async function stableSourceId(prefix: string, externalId: string, len: number = 20): Promise<string> {
  const hash = await sha256Hex(externalId);
  return `${prefix}_${hash.slice(0, len)}`;
}
