/**
 * SSRF guard for server-side fetches of user-supplied URLs.
 *
 * Blocks: non-http(s) schemes, localhost / *.local hostnames, and
 * private/loopback/link-local/metadata IP literals. This stops the obvious
 * attacks (127.0.0.1, 169.254.169.254, RFC1918 ranges); DNS-name targets
 * that resolve into private ranges require egress controls at the platform
 * level and are out of scope here.
 */
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata",
  "0.0.0.0",
  "::1",
  "[::1]",
]);

const PRIVATE_IPV4 =
  /^(127\.|10\.|192\.168\.|169\.254\.|0\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/;

function isPrivateIpv4(host: string): boolean {
  return PRIVATE_IPV4.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^192\.0\.0\./.test(host) ||
    /^198\.1[89]\./.test(host);
}

function isPrivateIpv6(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  return h === "::1" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80") || h === "::";
}

/** Returns a normalized URL string, or throws when the URL is not allowed. */
export function assertSafeFetchUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http(s) URLs are allowed");
  }

  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("URL host is not allowed");
  }
  if (host.includes(":") ? isPrivateIpv6(host) : isPrivateIpv4(host)) {
    throw new Error("URL host resolves to a private network");
  }

  return parsed.toString();
}
