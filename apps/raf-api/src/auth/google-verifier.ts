import { Injectable, Logger, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
}

interface TokenInfo {
  aud?: string;
  iss?: string;
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  exp?: string;
}

const ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);

/**
 * Checks a Google ID token with Google's tokeninfo endpoint, which validates
 * the signature and expiry; we check the audience is one of our client ids.
 */
@Injectable()
export class GoogleVerifier {
  private readonly logger = new Logger(GoogleVerifier.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  async verify(idToken: string): Promise<GoogleProfile> {
    const clientIds = this.config
      .get('GOOGLE_CLIENT_IDS', { infer: true })
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    if (clientIds.length === 0) {
      throw new ServiceUnavailableException('Google sign-in is not set up on this server');
    }

    let info: TokenInfo;
    try {
      const url = new URL('https://oauth2.googleapis.com/tokeninfo');
      url.searchParams.set('id_token', idToken);
      const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new UnauthorizedException('Google sign-in failed');
      info = (await response.json()) as TokenInfo;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.warn(`Google tokeninfo unreachable: ${String(error)}`);
      throw new ServiceUnavailableException('Could not reach Google, try again');
    }

    const verified = info.email_verified === true || info.email_verified === 'true';
    if (
      !info.sub ||
      !info.email ||
      !verified ||
      !info.aud ||
      !clientIds.includes(info.aud) ||
      !info.iss ||
      !ISSUERS.has(info.iss) ||
      Number(info.exp ?? 0) * 1000 < Date.now()
    ) {
      throw new UnauthorizedException('Google sign-in failed');
    }
    return {
      sub: info.sub,
      email: info.email.toLowerCase(),
      name: info.name?.trim() || info.email.split('@')[0],
    };
  }
}
