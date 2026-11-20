/**
 * Reads the payload of a JWT without verifying it. Only used to decide
 * whether to refresh early; the server is the one that verifies tokens.
 */
export function decodeJwt(token: string): { sub?: string; exp?: number } | null {
  const part = token.split('.')[1];
  if (!part) return null;
  try {
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
    return JSON.parse(globalThis.atob(base64)) as { sub?: string; exp?: number };
  } catch {
    return null;
  }
}

/** True when the token expires within `skewSeconds`. */
export function isExpiringSoon(token: string, skewSeconds = 30): boolean {
  const exp = decodeJwt(token)?.exp;
  return exp === undefined || exp * 1000 - Date.now() < skewSeconds * 1000;
}
