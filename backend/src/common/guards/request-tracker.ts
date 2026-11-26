import type { JwtService } from '@nestjs/jwt';

interface TrackedRequest {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
}

/**
 * Whose request limit a request counts towards. Mobile carriers put thousands
 * of phones behind one address, so a limit per address would stop strangers:
 * signed-in requests count per user, sign-in attempts per address and email,
 * and token refreshes per session. A far higher limit per address (see
 * AppModule) covers what this lets through.
 */
export function requestTracker(jwt: JwtService, req: TrackedRequest): string {
  const ip = req.ip ?? 'unknown';
  const authorization = req.headers?.authorization;
  if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
    try {
      const { sub } = jwt.verify<{ sub: string }>(authorization.slice(7));
      return `user:${sub}`;
    } catch {
      return `ip:${ip}`;
    }
  }
  const body = (req.body ?? {}) as { email?: unknown; refreshToken?: unknown };
  if (typeof body.email === 'string') {
    return `email:${ip}:${body.email.trim().toLowerCase().slice(0, 254)}`;
  }
  if (typeof body.refreshToken === 'string') {
    return `session:${ip}:${body.refreshToken.split('.')[0].slice(0, 36)}`;
  }
  return `ip:${ip}`;
}
