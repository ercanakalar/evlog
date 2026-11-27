import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import type { Member } from '../common/decorators/current-user.decorator';
import { Prisma } from '../generated/prisma/client';
import { HomeItemsService } from '../home-items/home-items.service';
import { ItemsService } from '../items/items.service';
import { PrismaService } from '../prisma/prisma.service';
import type { ProductLanguage } from '../products/product-matcher';
import { ProductsService } from '../products/products.service';
import { StorageService } from '../storage/storage.service';
import { sha256 } from '../common/utils/crypto';
import { normalizeProductName } from '../common/utils/normalize';
import { OcrItemDto, OcrResultDto } from './dto/ocr-result.dto';
import { ListReceiptsQueryDto, ReceiptLineDto, UpdateReceiptDto } from './dto/receipt.dto';
import { OcrClient, OcrDispatchResult } from './ocr.client';
import { mergeReceiptParts } from './receipt-merge';

const withItems = {
  items: {
    orderBy: { position: 'asc' },
    include: {
      brand: { select: { id: true, name: true } },
      // What each line added at home when the receipt was saved (not what using it up took).
      homeChanges: {
        where: { amount: { gt: 0 } },
        select: { amount: true, homeItem: { select: { id: true, name: true, unit: true } } },
      },
    },
  },
  scannedBy: { select: { id: true, fullName: true } },
} satisfies Prisma.ReceiptInclude;

/** Photos are read one at a time, so nobody may fill the queue. */
const MAX_READING = 3;
/** Receipts left unread longer than this are not read again at start. */
const RESUME_WITHIN_MS = 24 * 60 * 60_000;

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class ReceiptsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ReceiptsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly ocr: OcrClient,
    private readonly products: ProductsService,
    private readonly items: ItemsService,
    private readonly homeItems: HomeItemsService,
  ) {}

  onApplicationBootstrap() {
    this.resume().catch((error: Error) => this.logger.error(`Could not resume reading: ${error.message}`));
  }

  /** Reads receipts that were waiting or being read when the API stopped. */
  async resume(): Promise<void> {
    const left = await this.prisma.receipt.findMany({
      where: {
        status: { in: ['PENDING', 'PROCESSING'] },
        createdAt: { gt: new Date(Date.now() - RESUME_WITHIN_MS) },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    for (const { id } of left) void this.read(id);
    if (left.length > 0) this.logger.log(`Reading ${left.length} receipts left from before`);
  }

  /**
   * Stores the photo(s) and returns the receipt straight away; it is read in
   * the background and the app polls until its status changes. A long receipt
   * arrives as several photos, top to bottom.
   */
  async upload(
    { id: userId, householdId }: Member,
    uploaded: Express.Multer.File[],
    language: ProductLanguage,
  ) {
    if (uploaded.length === 0) throw new BadRequestException('Add a photo of the receipt');
    // The same photo sent twice as two parts would read every line twice.
    const seen = new Set<string>();
    const files = uploaded.filter((f) => {
      const hash = sha256(f.buffer);
      if (seen.has(hash)) return false;
      seen.add(hash);
      return true;
    });
    const mimeTypes = new Set(files.map((f) => f.mimetype));
    if (mimeTypes.size > 1) throw new BadRequestException('Send every part in the same format');
    const hash = sha256(Buffer.concat(files.map((f) => f.buffer)));
    const existing = await this.prisma.receipt.findUnique({
      where: { householdId_sha256: { householdId, sha256: hash } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException({
        message: 'This receipt was already scanned',
        receiptId: existing.id,
      });
    }
    await this.checkQueue(householdId);
    const imageKeys: string[] = [];
    let receipt: { id: string };
    try {
      for (const file of files) {
        imageKeys.push(await this.storage.save('receipts', file.buffer, file.mimetype));
      }
      receipt = await this.prisma.receipt.create({
        data: {
          householdId,
          userId,
          imageKeys,
          partCount: imageKeys.length,
          mimeType: files[0].mimetype,
          sha256: hash,
          language,
        },
      });
    } catch (error) {
      // e.g. the account was deleted meanwhile: leave no photo behind.
      await this.storage.remove(imageKeys);
      throw error;
    }
    return this.startReading(receipt.id);
  }

  /** Sends the stored photos to the reader again (after a failure). */
  async rescan(receiptId: string, householdId: string) {
    const receipt = await this.own(receiptId, householdId);
    if (receipt.status === 'CONFIRMED') {
      throw new ConflictException('Saved receipts cannot be rescanned');
    }
    if (receipt.status !== 'FAILED' && receipt.status !== 'PARSED') return this.get(receiptId, householdId);
    await this.checkQueue(householdId);
    return this.startReading(receiptId);
  }

  /** Called by the reader's callback (single-photo receipts only). */
  async applyCallback(receiptId: string, body: unknown) {
    const receipt = await this.prisma.receipt.findUnique({ where: { id: receiptId } });
    if (!receipt) throw new NotFoundException('Receipt not found');
    if (receipt.status !== 'PROCESSING' && receipt.status !== 'PENDING') {
      throw new ConflictException('Receipt is not waiting for a result');
    }
    await this.apply(receipt, await this.ocr.parse(body));
    return { ok: true };
  }

  /** Trips, newest first. */
  list(householdId: string, query: ListReceiptsQueryDto) {
    return this.prisma.receipt.findMany({
      where: {
        householdId,
        status: query.unsaved ? { not: 'CONFIRMED' } : query.status,
        merchantName: query.market,
        ...(query.from || query.to
          ? {
              issuedAt: {
                ...(query.from ? { gte: new Date(query.from) } : {}),
                ...(query.to ? { lt: new Date(query.to) } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ issuedAt: { sort: 'desc', nulls: 'first' } }, { id: 'desc' }],
      take: query.take,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      omit: { imageKeys: true, ocrRaw: true },
      include: { _count: { select: { items: true } }, scannedBy: withItems.scannedBy },
    });
  }

  /** Markets the household has shopped at, most visited first. */
  async markets(householdId: string) {
    const rows = await this.prisma.receipt.groupBy({
      by: ['merchantName'],
      where: { householdId, status: 'CONFIRMED', merchantName: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { merchantName: 'desc' } },
    });
    return rows.map((r) => ({ name: r.merchantName as string, trips: r._count._all }));
  }

  async get(receiptId: string, householdId: string) {
    await this.own(receiptId, householdId);
    return this.prisma.receipt.findUniqueOrThrow({
      where: { id: receiptId },
      include: withItems,
      omit: { imageKeys: true },
    });
  }

  async update(receiptId: string, householdId: string, dto: UpdateReceiptDto) {
    const receipt = await this.own(receiptId, householdId);
    if (receipt.status === 'CONFIRMED') {
      throw new ConflictException('Saved receipts cannot be edited');
    }
    const { items, issuedAt, ...fields } = dto;
    const lines = items ? await this.linesFromUser(items, receipt.language as ProductLanguage) : undefined;
    return this.prisma.$transaction(async (tx) => {
      if (lines) {
        await tx.receiptItem.deleteMany({ where: { receiptId } });
        await tx.receiptItem.createMany({ data: lines.map((line) => ({ ...line, receiptId })) });
      }
      return tx.receipt.update({
        where: { id: receiptId },
        data: {
          ...fields,
          ...(issuedAt ? { issuedAt: new Date(issuedAt) } : {}),
          // Manual entry is allowed when the reader failed.
          ...(receipt.status === 'FAILED' ? { status: 'PARSED', ocrError: null } : {}),
        },
        include: withItems,
        omit: { imageKeys: true },
      });
    });
  }

  /**
   * The user checked the lines: the receipt becomes a trip, every product
   * starts its countdown and matching at-home counts go up.
   */
  async confirm(receiptId: string, user: Member) {
    const receipt = await this.own(receiptId, user.householdId);
    if (receipt.status === 'CONFIRMED') return this.get(receiptId, user.householdId);
    if (receipt.status !== 'PARSED') {
      throw new ConflictException({
        message: 'Wait for the scan, or fill the fields in manually',
        code: 'RECEIPT_NOT_READ',
      });
    }
    if (!receipt.issuedAt || receipt.totalAmount === null) {
      throw new BadRequestException({
        message: 'Date and total are required before saving',
        code: 'RECEIPT_INCOMPLETE',
      });
    }
    if (receipt.issuedAt > new Date()) {
      throw new BadRequestException({
        message: 'Receipt date is in the future',
        code: 'RECEIPT_IN_FUTURE',
      });
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.receipt.update({
        where: { id: receiptId, status: 'PARSED' },
        data: { status: 'CONFIRMED', confirmedAt: new Date() },
      });
      await this.items.startCountdowns(tx, receiptId, receipt.issuedAt!);
      await this.homeItems.countReceipt(tx, user, receiptId);
    });
    return this.get(receiptId, user.householdId);
  }

  /** Deletes a receipt with its photos and takes back what it added to the at-home counts. */
  async remove(receiptId: string, householdId: string) {
    const receipt = await this.own(receiptId, householdId);
    await this.prisma.$transaction(async (tx) => {
      await this.homeItems.uncountReceipt(tx, householdId, receipt.id);
      await tx.receipt.delete({ where: { id: receipt.id } });
    });
    await this.storage.remove(receipt.imageKeys);
  }

  /** The original photo; `part` picks one part of a long receipt. */
  async image(receiptId: string, householdId: string, part = 0) {
    const receipt = await this.own(receiptId, householdId);
    const key = receipt.imageKeys[part];
    if (!key) throw new NotFoundException('No such part');
    return { stream: await this.storage.open(key), mimeType: receipt.mimeType };
  }

  private async checkQueue(householdId: string): Promise<void> {
    const reading = await this.prisma.receipt.count({
      where: {
        householdId,
        status: { in: ['PENDING', 'PROCESSING'] },
        createdAt: { gt: new Date(Date.now() - RESUME_WITHIN_MS) },
      },
    });
    if (reading < MAX_READING) return;
    throw new HttpException(
      { message: 'Wait until the receipts you sent are read', code: 'TOO_MANY_READING' },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private async startReading(receiptId: string) {
    const receipt = await this.prisma.receipt.update({
      where: { id: receiptId },
      data: { status: 'PROCESSING', ocrError: null, partsRead: 0 },
      include: withItems,
      omit: { imageKeys: true },
    });
    void this.read(receiptId);
    return receipt;
  }

  /** Reads the stored photos and saves what was found. Never throws. */
  private async read(receiptId: string): Promise<void> {
    try {
      const receipt = await this.prisma.receipt.findUnique({ where: { id: receiptId } });
      if (!receipt) return;
      const outcomes: OcrDispatchResult[] = [];
      for (const [index, key] of receipt.imageKeys.entries()) {
        const chunks: Buffer[] = [];
        for await (const chunk of await this.storage.open(key)) chunks.push(chunk as Buffer);
        outcomes.push(
          await this.ocr.dispatch({
            receiptId,
            kind: 'GROCERY',
            image: Buffer.concat(chunks),
            mimeType: receipt.mimeType,
          }),
        );
        // Interrupted, not unreadable: it is read again at the next start.
        if (this.ocr.stopping) return;
        // Deleted, or filled in by hand, while it was being read.
        if (!(await this.markRead(receiptId, index + 1))) return;
      }
      await this.apply(receipt, this.combine(outcomes));
    } catch (error) {
      if (this.ocr.stopping) return;
      // Deleted while its result was being saved.
      if (!(await this.isWaiting(receiptId).catch(() => true))) return;
      this.logger.error(`Could not read receipt ${receiptId}: ${String(error)}`);
      await this.prisma.receipt
        .updateMany({
          where: { id: receiptId, status: { in: ['PENDING', 'PROCESSING'] } },
          data: { status: 'FAILED', ocrError: 'UNREADABLE' },
        })
        .catch(() => undefined);
    }
  }

  /** Records how many parts are read; false when the receipt stopped waiting meanwhile. */
  private async markRead(receiptId: string, partsRead: number): Promise<boolean> {
    const { count } = await this.prisma.receipt.updateMany({
      where: { id: receiptId, status: { in: ['PENDING', 'PROCESSING'] } },
      data: { partsRead },
    });
    return count > 0;
  }

  private async isWaiting(receiptId: string): Promise<boolean> {
    const count = await this.prisma.receipt.count({
      where: { id: receiptId, status: { in: ['PENDING', 'PROCESSING'] } },
    });
    return count > 0;
  }

  private combine(outcomes: OcrDispatchResult[]): OcrDispatchResult {
    if (outcomes.length === 1) return outcomes[0];
    const failed = outcomes.find((o) => o.kind === 'failed');
    if (failed) return failed;
    if (outcomes.some((o) => o.kind === 'accepted')) {
      // Callbacks arrive one per receipt, so parts cannot be joined later.
      return { kind: 'failed', error: 'READER_UNAVAILABLE' };
    }
    const parts = outcomes.flatMap((o) => (o.kind === 'parsed' ? [o.result] : []));
    return { kind: 'parsed', result: mergeReceiptParts(parts) };
  }

  private async apply(
    { id: receiptId, language }: { id: string; language: string },
    outcome: OcrDispatchResult,
  ) {
    if (outcome.kind === 'accepted') return;
    if (outcome.kind === 'failed') {
      await this.prisma.receipt.update({
        where: { id: receiptId },
        data: { status: 'FAILED', ocrError: outcome.error },
      });
      return;
    }
    const result: OcrResultDto = outcome.result;
    const total = result.total ?? result.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const lines = await this.linesFromReader(result.items, language as ProductLanguage);
    await this.prisma.$transaction([
      this.prisma.receiptItem.deleteMany({ where: { receiptId } }),
      this.prisma.receiptItem.createMany({ data: lines.map((line) => ({ ...line, receiptId })) }),
      this.prisma.receipt.update({
        where: { id: receiptId },
        data: {
          status: 'PARSED',
          merchantName: result.merchantName?.trim(),
          issuedAt: result.issuedAt ? new Date(result.issuedAt) : undefined,
          totalAmount: round2(total),
          currency: result.currency ?? 'TRY',
          ocrRaw: JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue,
          ocrError: null,
        },
      }),
    ]);
  }

  /** Reader lines -> stored lines, each matched with the shelf-life table. */
  private async linesFromReader(items: OcrItemDto[], language: ProductLanguage) {
    const matches = await this.products.matchMany(
      items.map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit })),
      language,
    );
    return items.map((item, position) => {
      const match = matches[position];
      const quantity = item.quantity ?? 1;
      return {
        position,
        name: match.name,
        rawName: item.name.trim(),
        barcode: item.barcode,
        normalizedName: normalizeProductName(match.name),
        quantity,
        unit: item.unit,
        unitPrice: item.unitPrice ?? round2(item.totalPrice / quantity),
        totalPrice: item.totalPrice,
        category: match.category,
        shelfLifeDays: match.shelfLifeDays,
        openedShelfLifeDays: match.openedShelfLifeDays,
        needsReview: match.needsReview,
        // Checked on the review screen until the user unchecks it.
        countAtHome: true,
        brandId: match.brandId,
        packAmount: match.packAmount,
        packUnit: match.packUnit,
      };
    });
  }

  /**
   * Lines from the user. A line with `rawName` was reviewed: its name and
   * category win over the table. A line without one was typed in from the
   * paper receipt, so it is matched like a line from the reader.
   */
  private async linesFromUser(items: ReceiptLineDto[], language: ProductLanguage) {
    const matches = await this.products.matchMany(
      items.map((i) => ({ name: i.rawName ?? i.name, quantity: i.quantity, unit: i.unit })),
      language,
    );
    return items.map((item, position) => {
      const match = matches[position];
      const quantity = item.quantity ?? 1;
      const name = item.rawName ? item.name.trim() : match.name;
      return {
        position,
        name,
        rawName: (item.rawName ?? item.name).trim(),
        barcode: item.barcode,
        normalizedName: normalizeProductName(name),
        quantity,
        unit: item.unit,
        unitPrice: round2(item.totalPrice / quantity),
        totalPrice: item.totalPrice,
        category: item.category ?? match.category,
        shelfLifeDays: item.shelfLifeDays !== undefined ? item.shelfLifeDays : match.shelfLifeDays,
        openedShelfLifeDays: match.openedShelfLifeDays,
        needsReview: item.checked ? false : match.needsReview && !item.category,
        onShelf: item.onShelf ?? true,
        countAtHome: item.countAtHome !== undefined ? item.countAtHome : true,
        brandId: match.brandId,
        packAmount: match.packAmount,
        packUnit: match.packUnit,
      };
    });
  }

  private async own(receiptId: string, householdId: string) {
    const receipt = await this.prisma.receipt.findUnique({ where: { id: receiptId } });
    if (!receipt || receipt.householdId !== householdId) {
      throw new NotFoundException('Receipt not found');
    }
    return receipt;
  }
}
