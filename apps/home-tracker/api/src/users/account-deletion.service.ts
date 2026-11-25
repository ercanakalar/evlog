import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { HomeRemovalService } from '../homes/home-removal.service';
import { withoutPerson } from '../listings/listing-snapshot';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

/**
 * Deletes an account. What only concerns this person goes: profile, sessions,
 * receipts, ratings, listings and the homes they own. What another person
 * still relies on stays without a link to them:
 *  - a home with a tenant living in it stays with that tenant, ownerless;
 *  - condition photos in someone else's home stay, without their location.
 */
@Injectable()
export class AccountDeletionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly homes: HomeRemovalService,
  ) {}

  async remove(userId: string): Promise<void> {
    const keys = await this.prisma.$transaction(
      async (tx) => {
        // Lock the account (holds back uploads in flight), then its homes (an
        // owner and a tenant may be leaving the same home at the same time).
        await tx.$queryRaw`SELECT 1 FROM "User" WHERE "id" = ${userId}::uuid FOR UPDATE`;
        await tx.$queryRaw`
          SELECT 1 FROM "Home"
          WHERE "ownerId" = ${userId}::uuid
             OR "id" IN (SELECT "homeId" FROM "Tenancy" WHERE "tenantId" = ${userId}::uuid)
          ORDER BY "id" FOR UPDATE
        `;
        const receipts = await tx.receipt.findMany({ where: { userId }, select: { imageKey: true } });
        const files = [
          ...receipts.map((r) => r.imageKey),
          ...(await this.leaveOwnedHomes(tx, userId)),
          ...(await this.leaveRentedHomes(tx, userId)),
        ];
        await this.removeAccount(tx, userId);
        return files;
      },
      { timeout: 30_000 },
    );
    await this.storage.remove(keys);
  }

  private async leaveOwnedHomes(tx: Prisma.TransactionClient, userId: string): Promise<string[]> {
    const homes = await tx.home.findMany({
      where: { ownerId: userId },
      select: {
        id: true,
        tenancies: { where: { status: 'ACTIVE', tenantId: { not: null } }, select: { id: true } },
      },
    });
    const keys: string[] = [];
    for (const home of homes) {
      if (home.tenancies.length === 0) {
        keys.push(...(await this.homes.remove(tx, home.id)));
      } else {
        // The owner's sharing with brokers ends; the tenant keeps the rest.
        await tx.listing.deleteMany({ where: { homeId: home.id } });
      }
    }
    return keys;
  }

  private async leaveRentedHomes(tx: Prisma.TransactionClient, userId: string): Promise<string[]> {
    const tenancies = await tx.tenancy.findMany({
      where: { tenantId: userId, status: 'ACTIVE' },
      select: { id: true, home: { select: { id: true, ownerId: true } } },
    });
    const keys: string[] = [];
    for (const { id, home } of tenancies) {
      if (home.ownerId === null) {
        keys.push(...(await this.homes.remove(tx, home.id)));
      } else {
        await tx.tenancy.update({ where: { id }, data: { status: 'ENDED', endDate: new Date() } });
      }
    }
    return keys;
  }

  private async removeAccount(tx: Prisma.TransactionClient, userId: string): Promise<void> {
    await this.scrubSnapshots(tx, userId);
    // Before the receipts that back them, which cannot be deleted first.
    await tx.rating.deleteMany({ where: { authorId: userId } });

    await tx.conditionPhoto.updateMany({
      where: { uploadedById: userId },
      data: { latitude: null, longitude: null },
    });
    await tx.report.updateMany({ where: { reporterId: userId }, data: { details: null } });
    await tx.user.delete({ where: { id: userId } });
  }

  /** Takes this person's ratings and gas bills out of what owners already sent to brokers. */
  private async scrubSnapshots(tx: Prisma.TransactionClient, userId: string): Promise<void> {
    const ratings = await tx.rating.findMany({
      where: { authorId: userId },
      select: { id: true, homeId: true },
    });
    const gasBills = await tx.receipt.findMany({
      where: { userId, kind: 'UTILITY_GAS', homeId: { not: null } },
      distinct: ['homeId'],
      select: { homeId: true },
    });
    const ratingIds = new Set(ratings.map((r) => r.id));
    const gasHomes = new Set(gasBills.map((r) => r.homeId));
    const homeIds = [...ratings, ...gasBills].flatMap((r) => r.homeId ?? []);
    const updates = await tx.listingUpdate.findMany({
      where: { listing: { homeId: { in: homeIds } } },
      select: { id: true, snapshot: true, listing: { select: { homeId: true } } },
    });
    for (const { id, snapshot, listing } of updates) {
      const scrubbed = withoutPerson(snapshot as Record<string, unknown>, {
        ratingIds,
        hasGasBills: gasHomes.has(listing.homeId),
      });
      await tx.listingUpdate.update({
        where: { id },
        data: { snapshot: scrubbed as Prisma.InputJsonValue },
      });
    }
  }
}
