import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';

@Injectable()
export class HomeRemovalService {
  /**
   * Deletes a home and everything recorded about it. Returns the storage keys
   * of its photos; remove those files once the transaction has committed.
   */
  async remove(tx: Prisma.TransactionClient, homeId: string): Promise<string[]> {
    const photos = await tx.conditionPhoto.findMany({
      where: { session: { homeId } },
      select: { storageKey: true },
    });
    await tx.home.delete({ where: { id: homeId } });
    return photos.map((p) => p.storageKey);
  }
}
