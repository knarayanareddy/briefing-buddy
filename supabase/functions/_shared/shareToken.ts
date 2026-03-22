export function base64urlEncode(data: Uint8Array | string): string {
  let bytes: Uint8Array;
  if (typeof data === 'string') {
    bytes = new TextEncoder().encode(data);
  } else {
    bytes = data;
  }
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64urlDecodeToBytes(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

const getHmacKey = async (secret: string): Promise<CryptoKey> => {
  const secretBytes = new TextEncoder().encode(secret);
  return await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
};

export async function signSharePayload(payloadJson: object, secret: string): Promise<string> {
  const payloadStr = JSON.stringify(payloadJson);
  const encodedPayload = base64urlEncode(payloadStr);
  const key = await getHmacKey(secret);
  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(encodedPayload)
  );
  const encodedSignature = base64urlEncode(new Uint8Array(signatureBytes));
  return `${encodedPayload}.${encodedSignature}`;
}

export async function verifyShareToken(token: string, secret: string): Promise<{ ok: true, payload: any } | { ok: false, reason: string }> {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return { ok: false, reason: 'invalid_format' };
    const [encodedPayload, encodedSignature] = parts;
    const key = await getHmacKey(secret);
    
    // Constant time compare handled securely by subtle.verify
    const signatureBytes = base64urlDecodeToBytes(encodedSignature);
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      new TextEncoder().encode(encodedPayload)
    );
    
    if (!isValid) return { ok: false, reason: 'invalid_signature' };
    
    const payloadBytes = base64urlDecodeToBytes(encodedPayload);
    const payloadStr = new TextDecoder().decode(payloadBytes);
    const payload = JSON.parse(payloadStr);
    
    return { ok: true, payload };
  } catch (e: any) {
    return { ok: false, reason: e.message || 'verification_failed' };
  }
}
