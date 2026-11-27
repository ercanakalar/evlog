import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Member } from '../common/decorators/current-user.decorator';
import { Prisma } from '../generated/prisma/client';
import type { Category } from '../generated/prisma/enums';
import { addDays, DAY_MS } from '../common/utils/normalize';
import { HomeItemsService } from '../home-items/home-items.service';
import { PrismaService } from '../prisma/prisma.service';
import { OcrClient } from '../receipts/ocr.client';
import { ListItemsQueryDto, UpdateItemDto } from './dto/item.dto';

type Tx = Prisma.TransactionClient;

const itemSelect = {
  id: true,
  name: true,
  rawName: true,
  barcode: true,
  normalizedName: true,
  quantity: true,
  unit: true,
  totalPrice: true,
  category: true,
  shelfLifeDays: true,
  openedShelfLifeDays: true,
  expiresAt: true,
  packDate: true,
  openedAt: true,
  usedUpAt: true,
  packAmount: true,
  packUnit: true,
  brand: { select: { id: true, name: true } },
  receipt: { select: { id: true, merchantName: true, issuedAt: true } },
} satisfies Prisma.ReceiptItemSelect;

type ItemRow = Prisma.ReceiptItemGetPayload<{ select: typeof itemSelect }>;

/** Start of today in UTC; countdowns are whole days. */
const today = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

/**
 * A product from a saved receipt, with its countdown. `daysLeft` is null for
 * products that do not expire; `totalDays` is the full span the bar shows.
 */
export const withCountdown = (item: ItemRow) => {
  const start = item.openedAt ?? item.receipt.issuedAt;
  const daysLeft = item.expiresAt
    ? Math.max(0, Math.floor((item.expiresAt.getTime() - today().getTime()) / DAY_MS))
    : null;
  const totalDays =
    item.expiresAt && start
      ? Math.max(1, Math.round((item.expiresAt.getTime() - start.getTime()) / DAY_MS))
      : null;
  return {
    ...item,
    packAmount: item.packAmount?.toNumber() ?? null,
    boughtAt: item.receipt.issuedAt,
    market: item.receipt.merchantName,
    receiptId: item.receipt.id,
    receipt: undefined,
    daysLeft,
    totalDays,
  };
};

@Injectable()
export class ItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ocr: OcrClient,
    private readonly homeItems: HomeItemsService,
  ) {}

  /**
   * Reads the date printed on a photo of the product's pack and uses it
   * instead of the estimate. The photo is not kept. When the pack's barcode
   * was read too, it is kept on the product if the receipt had none, and
   * `barcodeMatches` says whether it is the product's barcode.
   */
  async readLabel(itemId: string, user: Member, image: Buffer, mimeType: string) {
    const item = await this.own(itemId, user.householdId);
    const label = await this.ocr.readLabel(image, mimeType);
    if (label.barcode && !item.barcode) {
      await this.prisma.receiptItem.update({ where: { id: itemId }, data: { barcode: label.barcode } });
    }
    const result = label.expiresOn
      // Noon in Istanbul, so the day is the printed day in the user's calendar.
      ? await this.update(itemId, user, { packExpiresAt: `${label.expiresOn}T09:00:00.000Z` })
      : await this.get(itemId, user.householdId);
    return {
      item: result,
      label: {
        expiresOn: label.expiresOn ?? null,
        barcode: label.barcode ?? null,
        barcodeMatches: item.barcode && label.barcode ? item.barcode === label.barcode : null,
        error: label.expiresOn ? null : (label.error ?? 'No expiry date found on the photo'),
        text: label.text?.slice(0, 300) ?? null,
      },
    };
  }

  /** Called when a receipt is saved: every product kept on the shelf gets its estimated expiry. */
  async startCountdowns(tx: Tx, receiptId: string, boughtAt: Date) {
    const items = await tx.receiptItem.findMany({
      where: { receiptId, onShelf: true, shelfLifeDays: { not: null } },
      select: { id: true, shelfLifeDays: true },
    });
    // One query per shelf life, not per product: the database can be far away.
    for (const days of new Set(items.map((item) => item.shelfLifeDays!))) {
      await tx.receiptItem.updateMany({
        where: { id: { in: items.filter((item) => item.shelfLifeDays === days).map((item) => item.id) } },
        data: { expiresAt: addDays(boughtAt, days) },
      });
    }
  }

  /**
   * The shelf: products from saved receipts that are kept on it (the user
   * can leave some out when saving) and not used up, soonest first.
   * Products that do not expire come last.
   */
  async shelf(householdId: string, query: ListItemsQueryDto) {
    const items = await this.prisma.receiptItem.findMany({
      where: {
        usedUpAt: null,
        onShelf: true,
        category: query.category,
        receipt: { householdId, status: 'CONFIRMED' },
        ...(query.expiring ? { expiresAt: { not: null } } : {}),
      },
      select: itemSelect,
      orderBy: [{ expiresAt: { sort: 'asc', nulls: 'last' } }, { name: 'asc' }],
      take: query.take,
    });
    return items.map(withCountdown);
  }

  /** One product with the times it was bought before (same normalised name). */
  async get(itemId: string, householdId: string) {
    const item = await this.own(itemId, householdId);
    const history = await this.prisma.receiptItem.findMany({
      where: {
        normalizedName: item.normalizedName,
        receipt: { householdId, status: 'CONFIRMED' },
      },
      select: {
        id: true,
        quantity: true,
        unitPrice: true,
        totalPrice: true,
        receipt: { select: { id: true, merchantName: true, issuedAt: true } },
      },
      orderBy: { receipt: { issuedAt: 'desc' } },
      take: 10,
    });
    return {
      ...withCountdown(item),
      history: history.map((h) => ({
        id: h.id,
        quantity: h.quantity,
        unitPrice: h.unitPrice,
        totalPrice: h.totalPrice,
        receiptId: h.receipt.id,
        market: h.receipt.merchantName,
        boughtAt: h.receipt.issuedAt,
      })),
    };
  }

  /**
   * Mark opened (shorter countdown), set the pack date, or mark used up.
   * Using a product up lowers the at-home counts it matches; any that reach 0
   * go on the market list, which `addedToList` reports.
   */
  async update(itemId: string, user: Member, dto: UpdateItemDto) {
    const item = await this.own(itemId, user.householdId);
    const data: Prisma.ReceiptItemUpdateInput = {};

    if (dto.category) data.category = dto.category as Category;
    if (dto.usedUp !== undefined) data.usedUpAt = dto.usedUp ? new Date() : null;

    if (dto.packExpiresAt !== undefined) {
      if (dto.packExpiresAt === null) {
        data.packDate = false;
        data.expiresAt = this.estimate(item, item.openedAt);
      } else {
        data.packDate = true;
        data.expiresAt = new Date(dto.packExpiresAt);
      }
    }

    if (dto.opened !== undefined) {
      const openedAt = dto.opened ? new Date() : null;
      data.openedAt = openedAt;
      if (!item.packDate || dto.opened) {
        const estimate = this.estimate(item, openedAt);
        // Opening never makes a product last longer than the pack says.
        data.expiresAt =
          item.packDate && item.expiresAt && estimate && estimate > item.expiresAt
            ? item.expiresAt
            : estimate;
      }
    }

    if (Object.keys(data).length === 0) throw new BadRequestException('Nothing to change');
    const usedUpChanged = dto.usedUp !== undefined && dto.usedUp !== (item.usedUpAt !== null);
    const addedToList = await this.prisma.$transaction(async (tx) => {
      await tx.receiptItem.update({ where: { id: itemId }, data });
      if (!usedUpChanged) return null;
      if (!dto.usedUp) {
        await this.homeItems.restoreUsedUp(tx, itemId);
        return null;
      }
      const line = {
        id: item.id,
        receiptId: item.receipt.id,
        name: item.name,
        rawName: item.rawName,
        quantity: item.quantity,
        unit: item.unit,
      };
      return this.homeItems.useUp(tx, user, line, dto.newListName);
    });
    return { ...(await this.get(itemId, user.householdId)), addedToList };
  }

  private estimate(item: ItemRow, openedAt: Date | null): Date | null {
    const boughtAt = item.receipt.issuedAt;
    if (!boughtAt || item.shelfLifeDays === null) return null;
    const unopened = addDays(boughtAt, item.shelfLifeDays);
    if (!openedAt) return unopened;
    const opened = addDays(openedAt, item.openedShelfLifeDays ?? item.shelfLifeDays);
    return opened < unopened ? opened : unopened;
  }

  private async own(itemId: string, householdId: string) {
    const item = await this.prisma.receiptItem.findFirst({
      where: { id: itemId, receipt: { householdId, status: 'CONFIRMED' } },
      select: itemSelect,
    });
    if (!item) throw new NotFoundException('Product not found');
    return item;
  }
}
