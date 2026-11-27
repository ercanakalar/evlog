import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomInt } from 'node:crypto';
import type { Env } from '../config/env.validation';
import { Prisma } from '../generated/prisma/client';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { randomToken, safeEqual, sha256 } from '../common/utils/crypto';
import { addDays } from '../common/utils/normalize';
import { LoginDto, RegisterDto, ResetPasswordDto, TokenPairDto } from './dto/auth.dto';
import { GoogleVerifier } from './google-verifier';
import { resetCodeMail } from './reset-code-mail';

const RESET_CODE_MINUTES = 15;
const RESET_ATTEMPTS = 5;
/** A new code is sent at most this often. */
const RESET_INTERVAL_MS = 60_000;
/**
 * How long a replaced refresh token keeps working: a phone that lost the
 * connection before the answer arrived would otherwise be signed out.
 */
const ROTATION_GRACE_MS = 60_000;

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
    private readonly googleVerifier: GoogleVerifier,
    private readonly mail: MailService,
  ) {}

  async register(dto: RegisterDto, userAgent?: string): Promise<TokenPairDto> {
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });
    const user = await this.prisma.user
      .create({
        data: {
          email: dto.email,
          passwordHash,
          fullName: dto.fullName ?? dto.email.split('@')[0],
          household: { create: {} },
        },
      })
      .catch((error: unknown) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new ConflictException({ message: 'This email already has an account', code: 'EMAIL_TAKEN' });
        }
        throw error;
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
      throw new UnauthorizedException({
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
    }
    return this.issueTokens(user.id, user.email, userAgent);
  }

  /**
   * Signs in with a Google ID token. Creates the account on first use, or
   * links Google to the account that has this email.
   *
   * Nobody proves an address is theirs when they sign up with a password. So
   * that someone who signed up with another person's address cannot stay in
   * the account, linking takes away a password set before the address was
   * verified and signs out its devices.
   */
  async google(idToken: string, userAgent?: string): Promise<TokenPairDto> {
    const profile = await this.googleVerifier.verify(idToken);
    const linked = await this.prisma.user.findUnique({ where: { googleSub: profile.sub } });
    if (linked) return this.issueTokens(linked.id, linked.email, userAgent);

    const now = new Date();
    const user = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { email: profile.email } });
      if (!existing) {
        return tx.user.create({
          data: {
            email: profile.email,
            googleSub: profile.sub,
            fullName: profile.name,
            emailVerifiedAt: now,
            household: { create: {} },
          },
        });
      }
      if (existing.emailVerifiedAt) {
        return tx.user.update({ where: { id: existing.id }, data: { googleSub: profile.sub } });
      }
      await tx.authSession.deleteMany({ where: { userId: existing.id } });
      return tx.user.update({
        where: { id: existing.id },
        data: { googleSub: profile.sub, emailVerifiedAt: now, passwordHash: null },
      });
    });
    return this.issueTokens(user.id, user.email, userAgent);
  }

  /** Emails a code to reset the password with, if the account exists. */
  async forgotPassword(email: string, lang: 'en' | 'tr' = 'en'): Promise<void> {
    if (!this.mail.configured) {
      throw new ServiceUnavailableException({
        message: 'Password reset is not set up on this server',
        code: 'RESET_UNAVAILABLE',
      });
    }
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordReset: { select: { createdAt: true } } },
    });
    if (!user) return;
    const last = user.passwordReset?.createdAt.getTime() ?? 0;
    if (Date.now() - last < RESET_INTERVAL_MS) return;

    const code = String(randomInt(100_000_000)).padStart(8, '0');
    const reset = {
      codeHash: sha256(`${user.id}:${code}`),
      attempts: 0,
      expiresAt: new Date(Date.now() + RESET_CODE_MINUTES * 60_000),
      createdAt: new Date(),
    };
    await this.prisma.passwordReset.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...reset },
      update: reset,
    });
    // Not awaited: how long sending takes would tell whether the account exists.
    void this.mail.send({ to: email, ...resetCodeMail(code, RESET_CODE_MINUTES, lang) });
  }

  async resetPassword(dto: ResetPasswordDto, userAgent?: string): Promise<TokenPairDto> {
    const wrong = new BadRequestException({
      message: 'The code is wrong or has expired',
      code: 'RESET_CODE_INVALID',
    });
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, email: true, passwordReset: true },
    });
    if (!user?.passwordReset) throw wrong;
    // Counted before comparing, so parallel guesses cannot get extra attempts.
    const { count } = await this.prisma.passwordReset.updateMany({
      where: { userId: user.id, attempts: { lt: RESET_ATTEMPTS }, expiresAt: { gt: new Date() } },
      data: { attempts: { increment: 1 } },
    });
    if (count === 0) throw wrong;
    const codeHash = sha256(`${user.id}:${dto.code}`);
    if (!safeEqual(user.passwordReset.codeHash, codeHash)) throw wrong;

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    await this.prisma.$transaction(async (tx) => {
      // Only one request can use the code.
      const used = await tx.passwordReset.deleteMany({ where: { userId: user.id, codeHash } });
      if (used.count === 0) throw wrong;
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash, emailVerifiedAt: new Date() },
      });
      await tx.authSession.deleteMany({ where: { userId: user.id } });
    });
    return this.issueTokens(user.id, user.email, userAgent);
  }

  /** Rotates the refresh token: the old one stops working after a short grace period. */
  async refresh(refreshToken: string, userAgent?: string): Promise<TokenPairDto> {
    const session = await this.findActiveSession(refreshToken);
    // Keeps the time of the first use, so using it again does not extend the grace period.
    await this.prisma.authSession.updateMany({
      where: { id: session.id, rotatedAt: null },
      data: { rotatedAt: new Date() },
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
      (session.rotatedAt && Date.now() - session.rotatedAt.getTime() > ROTATION_GRACE_MS) ||
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
    // Sessions that can no longer be used are not kept.
    await this.prisma.authSession.deleteMany({
      where: {
        userId,
        OR: [
          { expiresAt: { lt: new Date() } },
          { revokedAt: { not: null } },
          { rotatedAt: { lt: new Date(Date.now() - ROTATION_GRACE_MS) } },
        ],
      },
    });
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
