export const GATE_COOKIE = "vb_gate";

/**
 * Derives the cookie value that proves the passcode was entered. Uses Web
 * Crypto rather than node:crypto so the same helper runs in middleware (Edge)
 * and in a server action.
 *
 * The token is a hash of the passcode, so it is a bearer credential: whoever
 * holds the cookie is in. That is the intended strength — a door lock for a
 * single-user board, not an identity system. See docs/SECURITY.md.
 */
export async function gateToken(passcode: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`vision-board:${passcode}`),
  );
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Length-independent comparison, so a wrong guess leaks nothing by timing. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
