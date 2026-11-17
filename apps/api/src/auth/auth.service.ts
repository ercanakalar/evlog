import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import type { Env } from '../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';
import { randomToken, safeEqual, sha256 } from '../common/utils/crypto';
import { addDays } from '../common/utils/normalize';
import { LoginDto, RegisterDto, TokenPairDto } from './dto/auth.dto';

export interface JwtPayload {
  sub: string;
  email: string;
}

const ttlToSeconds = (ttl: string): number => {
  const unit = ttl.slice(-1);
  const value = Number(ttl.slice(0, -1));
  const factor = { s: 1, m: 60, h: 3600, d: 86400 }[unit] ?? 1;
  return value * factor;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async register(dto: RegisterDto, userAgent?: string): Promise<TokenPairDto> {
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });
    // A duplicate email surfaces as P2002 -> 409 via PrismaExceptionFilter.
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
      },
    });
    return this.issueTokens(user.id, user.email, userAgent);
  }

  async login(dto: LoginDto, userAgent?: string): Promise<TokenPairDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    // Verify against a dummy hash when the user is missing to keep timing flat.
    const valid = await argon2
      .verify(user?.passwordHash ?? DUMMY_HASH, dto.password)
      .catch(() => false);
    if (!user || !valid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.issueTokens(user.id, user.email, userAgent);
  }

  /** Rotates the refresh token: the old one stops working immediately. */
  async refresh(refreshToken: string, userAgent?: string): Promise<TokenPairDto> {
    const session = await this.findActiveSession(refreshToken);
    await this.prisma.authSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(session.user.id, session.user.email, userAgent);
  }

  async logout(refreshToken: string): Promise<void> {
    const session = await this.findActiveSession(refreshToken).catch(() => null);
    if (session) {
      await this.prisma.authSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
    }
  }

  private async findActiveSession(refreshToken: string) {
    const [sessionId, secret] = refreshToken.split('.');
    if (!sessionId || !secret || !UUID_RE.test(sessionId)) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const session = await this.prisma.authSession.findUnique({
      where: { id: sessionId },
      include: { user: { select: { id: true, email: true } } },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt < new Date() ||
      !safeEqual(session.refreshTokenHash, sha256(secret))
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return session;
  }

  private async issueTokens(
    userId: string,
    email: string,
    userAgent?: string,
  ): Promise<TokenPairDto> {
    const secret = randomToken(48);
    const session = await this.prisma.authSession.create({
      data: {
        userId,
        refreshTokenHash: sha256(secret),
        userAgent: userAgent?.slice(0, 255),
        expiresAt: addDays(
          new Date(),
          this.config.get('JWT_REFRESH_TTL_DAYS', { infer: true }),
        ),
      },
    });
    const payload: JwtPayload = { sub: userId, email };
    const accessToken = await this.jwt.signAsync(payload);
    return {
      accessToken,
      refreshToken: `${session.id}.${secret}`,
      expiresIn: ttlToSeconds(this.config.get('JWT_ACCESS_TTL', { infer: true })),
    };
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHRzb21lc2FsdA$4P2fZ3oC1d8l4Jt0p7dK0q1o3m0Y4xjJ0bq2n2l3yU0';
