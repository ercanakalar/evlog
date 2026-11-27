import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import type { Member } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { newInviteCode, parseInviteCode, showInviteCode } from './invite-code';

/** How long an invite code can be used, and how many people one household can have. */
const INVITE_HOURS = 24;
export const MAX_MEMBERS = 8;

type Tx = Prisma.TransactionClient;

/**
 * The people who share one home. Everyone has a household of their own; a
 * member shows an invite code, and whoever types it in brings their data
 * along and from then on shares everything with the others.
 */
@Injectable()
export class HouseholdsService {
  constructor(private readonly prisma: PrismaService) {}

  /** The members, and the invite code while one can be used. */
  async get({ id: userId, householdId }: Member) {
    const household = await this.prisma.household.findUniqueOrThrow({
      where: { id: householdId },
      select: {
        id: true,
        inviteCode: true,
        inviteExpiresAt: true,
        members: { select: { id: true, fullName: true, email: true }, orderBy: { createdAt: 'asc' } },
      },
    });
    const live = household.inviteCode && household.inviteExpiresAt && household.inviteExpiresAt > new Date();
    return {
      id: household.id,
      members: household.members.map((m) => ({ ...m, me: m.id === userId })),
      invite: live ? { code: showInviteCode(household.inviteCode!), expiresAt: household.inviteExpiresAt } : null,
      maxMembers: MAX_MEMBERS,
    };
  }

  /** A new invite code, valid for a day and for one person; it replaces any earlier one. */
  async invite(member: Member) {
    const members = await this.prisma.user.count({ where: { householdId: member.householdId } });
    if (members >= MAX_MEMBERS) {
      throw new ConflictException({ message: 'This household is full', code: 'HOUSEHOLD_FULL' });
    }
    const inviteExpiresAt = new Date(Date.now() + INVITE_HOURS * 3_600_000);
    // Codes are random; on the rare clash with another household's, draw again.
    for (let attempt = 0; ; attempt++) {
      try {
        await this.prisma.household.update({
          where: { id: member.householdId },
          data: { inviteCode: newInviteCode(), inviteExpiresAt },
        });
        return this.get(member);
      } catch (error) {
        const clash = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
        if (!clash || attempt >= 4) throw error;
      }
    }
  }

  async cancelInvite(member: Member) {
    await this.prisma.household.update({
      where: { id: member.householdId },
      data: { inviteCode: null, inviteExpiresAt: null },
    });
    return this.get(member);
  }

  /**
   * Joins the household whose invite code this is. Everything the person
   * had moves with them: receipts, shelf and lists; at-home counts of a
   * product the household also has are added together. Only someone who
   * lives alone can join, so nobody else's data is moved without them.
   */
  async join(member: Member, input: string) {
    const invalid = new BadRequestException({ message: 'This code is wrong or has expired', code: 'INVITE_INVALID' });
    const code = parseInviteCode(input);
    if (!code) throw invalid;
    const target = await this.prisma.household.findUnique({ where: { inviteCode: code } });
    if (!target || !target.inviteExpiresAt || target.inviteExpiresAt <= new Date()) throw invalid;
    if (target.id === member.householdId) {
      throw new ConflictException({ message: 'You already live in this household', code: 'ALREADY_MEMBER' });
    }

    await this.prisma.$transaction(async (tx) => {
      // Both households, always in the same order so two joins cannot deadlock.
      const [first, second] = [target.id, member.householdId].sort();
      await tx.$queryRaw`SELECT 1 FROM "Household" WHERE "id" = ${first}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT 1 FROM "Household" WHERE "id" = ${second}::uuid FOR UPDATE`;
      // Checked again under the locks: the code may have been used meanwhile.
      const still = await tx.household.findUnique({ where: { id: target.id } });
      if (still?.inviteCode !== code) throw invalid;
      if ((await tx.user.count({ where: { householdId: target.id } })) >= MAX_MEMBERS) {
        throw new ConflictException({ message: 'This household is full', code: 'HOUSEHOLD_FULL' });
      }
      if ((await tx.user.count({ where: { householdId: member.householdId } })) > 1) {
        throw new ConflictException({
          message: 'Leave the household you share first',
          code: 'LEAVE_FIRST',
        });
      }
      await this.moveData(tx, member.householdId, target.id);
      await tx.user.update({ where: { id: member.id }, data: { householdId: target.id } });
      await tx.household.delete({ where: { id: member.householdId } });
      // One code, one person: the next one gets a new code.
      await tx.household.update({ where: { id: target.id }, data: { inviteCode: null, inviteExpiresAt: null } });
    });
    return this.get({ id: member.id, householdId: target.id });
  }

  /**
   * Leaves the household for a new, empty one of their own. What was shared
   * stays with the others, including the receipts this person scanned.
   */
  async leave(member: Member) {
    const householdId = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM "Household" WHERE "id" = ${member.householdId}::uuid FOR UPDATE`;
      if ((await tx.user.count({ where: { householdId: member.householdId } })) <= 1) {
        throw new ConflictException({ message: 'Nobody else lives in this household', code: 'LIVES_ALONE' });
      }
      const fresh = await tx.household.create({ data: {} });
      await tx.user.update({ where: { id: member.id }, data: { householdId: fresh.id } });
      return fresh.id;
    });
    return this.get({ id: member.id, householdId });
  }

  private async moveData(tx: Tx, from: string, to: string) {
    // The same photo already sent in the household: keep both, so nothing is lost
    // (the photo hash only stops one household from sending the same photo twice).
    await tx.$executeRaw`
      UPDATE "Receipt" SET "sha256" = "sha256" || ':' || "id"
      WHERE "householdId" = ${from}::uuid
        AND "sha256" IN (SELECT "sha256" FROM "Receipt" WHERE "householdId" = ${to}::uuid)`;
    await tx.receipt.updateMany({ where: { householdId: from }, data: { householdId: to } });
    await tx.shoppingList.updateMany({ where: { householdId: from }, data: { householdId: to } });

    const theirs = await tx.homeItem.findMany({ where: { householdId: to } });
    for (const item of await tx.homeItem.findMany({ where: { householdId: from } })) {
      const same = theirs.find((h) => h.normalizedName === item.normalizedName);
      if (!same) {
        await tx.homeItem.update({ where: { id: item.id }, data: { householdId: to } });
        continue;
      }
      // Counted in other units (pieces and kg) cannot be added up: the
      // household's count stays, and this one goes with what raised it.
      if (same.unit === item.unit) {
        const newer = (item.lastMatchAt?.getTime() ?? 0) > (same.lastMatchAt?.getTime() ?? 0);
        await tx.homeItemChange.updateMany({ where: { homeItemId: item.id }, data: { homeItemId: same.id } });
        await tx.homeItem.update({
          where: { id: same.id },
          data: {
            count: { increment: item.count },
            ...(newer
              ? {
                  lastMatchAdded: item.lastMatchAdded,
                  lastMatchMarket: item.lastMatchMarket,
                  lastMatchAt: item.lastMatchAt,
                  lastMatchReceiptId: item.lastMatchReceiptId,
                }
              : {}),
          },
        });
      }
      await tx.homeItem.delete({ where: { id: item.id } });
    }
  }
}
