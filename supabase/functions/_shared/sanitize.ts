/**
 * Redacts common secret patterns from text.
 * @param text The text to sanitize
 * @returns Redacted text
 */
export function redactSecrets(text: string): string {
  if (!text) return text;
  
  // Pattern matching for various secret types
  const patterns = [
    /sk-[a-zA-Z0-9]{20,}/g,          // OpenAI
    /ghp_[a-zA-Z0-9]{36,}/g,        // GitHub PAT
    /github_pat_[a-zA-Z0-9]{22,}_[a-zA-Z0-9]{59,}/g, // GitHub Fine-grained PAT
    /AIza[0-9A-Za-z-_]{35}/g,       // Google API Key
    /Bearer\s+(ey[a-zA-Z0-9]{10,}\.ey[a-zA-Z0-9]{10,}\.[a-zA-Z0-9_-]{10,})/gi, // JWT Bearer
    /ey[a-zA-Z0-9]{10,}\.ey[a-zA-Z0-9]{10,}\.[a-zA-Z0-9_-]{10,}/g, // JWT-like x.y.z
    /(password|passcode|wifi|secret|key|token|auth|credential|api_key|api-key)\s*[:=]\s*[^\s,;"]+/gi, // Generic secrets
  ];

  let sanitized = text;
  patterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, (match) => {
      // Keep only a hint or fully redact
      if (match.toLowerCase().includes("password") || match.toLowerCase().includes("wifi")) {
        const parts = match.split(/[:=]/);
        return parts[0] + ": [REDACTED]";
      }
      return "[REDACTED]";
    });
  });

  return sanitized;
}

/**
 * Redacts PII (emails, phone numbers) from text.
 */
export function stripPII(text: string): string {
  if (!text) return text;

  const patterns = [
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // Emails
    /(\+\d{1,3}\s?)?(\(\d{1,4}\)|\d{1,4})[\s.-]?\d{1,4}[\s.-]?\d{1,9}/g, // Phone numbers
  ];

  let sanitized = text;
  patterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, "[PII]");
  });

  return sanitized;
}

/**
 * Recursively walks an object and applies sanitization to string fields.
 * Truncates long strings and applies redaction + PII stripping.
 */
export function sanitizeDeep(obj: any, maxLen = 500): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    let s = obj;
    if (s.length > maxLen) {
      s = s.slice(0, maxLen) + "... [TRUNCATED]";
    }
    return redactSecrets(stripPII(s));
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeDeep(item, maxLen));
  }

  if (typeof obj === "object") {
    const sanitizedObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitizedObj[key] = sanitizeDeep(obj[key], maxLen);
      }
    }
    return sanitizedObj;
  }

  return obj;
}

/**
 * Sanitizes user data for use in LLM prompts.
 */
export function sanitizeUserData(userData: any): any {
  return sanitizeDeep(userData, 500);
}
