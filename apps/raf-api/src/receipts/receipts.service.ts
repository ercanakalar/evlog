import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { HomeItemsService } from '../home-items/home-items.service';
import { ItemsService } from '../items/items.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { StorageService } from '../storage/storage.service';
import { sha256 } from '../common/utils/crypto';
import { normalizeProductName } from '../common/utils/normalize';
import { OcrItemDto, OcrResultDto } from './dto/ocr-result.dto';
import { ListReceiptsQueryDto, ReceiptLineDto, UpdateReceiptDto } from './dto/receipt.dto';
import { OcrClient, OcrDispatchResult } from './ocr.client';
import { mergeReceiptParts } from './receipt-merge';

const withItems = {
  items: { orderBy: { position: 'asc' } },
} satisfies Prisma.ReceiptInclude;

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class ReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly ocr: OcrClient,
    private readonly products: ProductsService,
    private readonly items: ItemsService,
    private readonly homeItems: HomeItemsService,
  ) {}

  /**
   * Stores the photo(s), sends them to the reader and returns the receipt.
   * A long receipt arrives as several photos, top to bottom.
   */
  async upload(userId: string, files: Express.Multer.File[]) {
    if (files.length === 0) throw new BadRequestException('Add a photo of the receipt');
    const mimeTypes = new Set(files.map((f) => f.mimetype));
    if (mimeTypes.size > 1) throw new BadRequestException('Send every part in the same format');
    const hash = sha256(Buffer.concat(files.map((f) => f.buffer)));
    const existing = await this.prisma.receipt.findUnique({
      where: { userId_sha256: { userId, sha256: hash } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException({
        message: 'This receipt was already scanned',
        receiptId: existing.id,
      });
    }
    const imageKeys: string[] = [];
    for (const file of files) {
      imageKeys.push(await this.storage.save('receipts', file.buffer, file.mimetype));
    }
    const receipt = await this.prisma.receipt.create({
      data: { userId, imageKeys, mimeType: files[0].mimetype, sha256: hash },
    });
    return this.scan(receipt.id, files.map((f) => f.buffer));
  }

  /** Sends the stored photos to the reader again (after a failure). */
  async rescan(receiptId: string, userId: string) {
    const receipt = await this.own(receiptId, userId);
    if (receipt.status === 'CONFIRMED') {
      throw new ConflictException('Saved receipts cannot be rescanned');
    }
    const images: Buffer[] = [];
    for (const key of receipt.imageKeys) {
      const chunks: Buffer[] = [];
      for await (const chunk of await this.storage.open(key)) chunks.push(chunk as Buffer);
      images.push(Buffer.concat(chunks));
    }
    return this.scan(receiptId, images);
  }

  /** Called by the reader's callback (single-photo receipts only). */
  async applyCallback(receiptId: string, body: unknown) {
    const receipt = await this.prisma.receipt.findUnique({ where: { id: receiptId } });
    if (!receipt) throw new NotFoundException('Receipt not found');
    if (receipt.status !== 'PROCESSING' && receipt.status !== 'PENDING') {
      throw new ConflictException('Receipt is not waiting for a result');
    }
    await this.apply(receiptId, await this.ocr.parse(body));
    return { ok: true };
  }

  /** Trips, newest first. */
  list(userId: string, query: ListReceiptsQueryDto) {
    return this.prisma.receipt.findMany({
      where: {
        userId,
        status: query.status,
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
      include: { _count: { select: { items: true } } },
    });
  }

  /** Markets the user has shopped at, most visited first. */
  async markets(userId: string) {
    const rows = await this.prisma.receipt.groupBy({
      by: ['merchantName'],
      where: { userId, status: 'CONFIRMED', merchantName: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { merchantName: 'desc' } },
    });
    return rows.map((r) => ({ name: r.merchantName as string, trips: r._count._all }));
  }

  async get(receiptId: string, userId: string) {
    await this.own(receiptId, userId);
    return this.prisma.receipt.findUniqueOrThrow({
      where: { id: receiptId },
      include: withItems,
      omit: { imageKeys: true },
    });
  }

  async update(receiptId: string, userId: string, dto: UpdateReceiptDto) {
    const receipt = await this.own(receiptId, userId);
    if (receipt.status === 'CONFIRMED') {
      throw new ConflictException('Saved receipts cannot be edited');
    }
    const { items, issuedAt, ...fields } = dto;
    const lines = items ? await this.linesFromUser(items) : undefined;
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
  async confirm(receiptId: string, userId: string) {
    const receipt = await this.own(receiptId, userId);
    if (receipt.status === 'CONFIRMED') return this.get(receiptId, userId);
    if (receipt.status !== 'PARSED') {
      throw new ConflictException('Wait for the scan, or fill the fields in manually');
    }
    if (!receipt.issuedAt || receipt.totalAmount === null) {
      throw new BadRequestException('Date and total are required before saving');
    }
    if (receipt.issuedAt > new Date()) {
      throw new BadRequestException('Receipt date is in the future');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.receipt.update({
        where: { id: receiptId, status: 'PARSED' },
        data: { status: 'CONFIRMED', confirmedAt: new Date() },
      });
      await this.items.startCountdowns(tx, receiptId, receipt.issuedAt!);
      await this.homeItems.countReceipt(tx, userId, receiptId);
    });
    return this.get(receiptId, userId);
  }

  async remove(receiptId: string, userId: string) {
    const receipt = await this.own(receiptId, userId);
    await this.prisma.receipt.delete({ where: { id: receipt.id } });
  }

  /** The original photo; `part` picks one part of a long receipt. */
  async image(receiptId: string, userId: string, part = 0) {
    const receipt = await this.own(receiptId, userId);
    const key = receipt.imageKeys[part];
    if (!key) throw new NotFoundException('No such part');
    return { stream: await this.storage.open(key), mimeType: receipt.mimeType };
  }

  private async scan(receiptId: string, images: Buffer[]) {
    await this.prisma.receipt.update({
      where: { id: receiptId },
      data: { status: 'PROCESSING', ocrError: null },
    });
    const receipt = await this.prisma.receipt.findUniqueOrThrow({ where: { id: receiptId } });
    const outcomes: OcrDispatchResult[] = [];
    for (const image of images) {
      outcomes.push(
        await this.ocr.dispatch({ receiptId, kind: 'GROCERY', image, mimeType: receipt.mimeType }),
      );
    }
    await this.apply(receiptId, this.combine(outcomes));
    return this.prisma.receipt.findUniqueOrThrow({
      where: { id: receiptId },
      include: withItems,
      omit: { imageKeys: true },
    });
  }

  private combine(outcomes: OcrDispatchResult[]): OcrDispatchResult {
    if (outcomes.length === 1) return outcomes[0];
    const failed = outcomes.find((o) => o.kind === 'failed');
    if (failed) return failed;
    if (outcomes.some((o) => o.kind === 'accepted')) {
      // Callbacks arrive one per receipt, so parts cannot be joined later.
      return { kind: 'failed', error: 'The reader must answer long receipts straight away' };
    }
    const parts = outcomes.flatMap((o) => (o.kind === 'parsed' ? [o.result] : []));
    return { kind: 'parsed', result: mergeReceiptParts(parts) };
  }

  private async apply(receiptId: string, outcome: OcrDispatchResult) {
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
    const lines = await this.linesFromReader(result.items);
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
  private async linesFromReader(items: OcrItemDto[]) {
    const matches = await this.products.matchMany(
      items.map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit })),
    );
    return items.map((item, position) => {
      const match = matches[position];
      const quantity = item.quantity ?? 1;
      return {
        position,
        name: match.name,
        rawName: item.name.trim(),
        normalizedName: normalizeProductName(match.name),
        quantity,
        unit: item.unit,
        unitPrice: item.unitPrice ?? round2(item.totalPrice / quantity),
        totalPrice: item.totalPrice,
        category: match.category,
        shelfLifeDays: match.shelfLifeDays,
        openedShelfLifeDays: match.openedShelfLifeDays,
        needsReview: match.needsReview,
      };
    });
  }

  /**
   * Lines from the user. A line with `rawName` was reviewed: its name and
   * category win over the table. A line without one was typed in from the
   * paper receipt, so it is matched like a line from the reader.
   */
  private async linesFromUser(items: ReceiptLineDto[]) {
    const matches = await this.products.matchMany(
      items.map((i) => ({ name: i.rawName ?? i.name, quantity: i.quantity, unit: i.unit })),
    );
    return items.map((item, position) => {
      const match = matches[position];
      const quantity = item.quantity ?? 1;
      const name = item.rawName ? item.name.trim() : match.name;
      return {
        position,
        name,
        rawName: (item.rawName ?? item.name).trim(),
        normalizedName: normalizeProductName(name),
        quantity,
        unit: item.unit,
        unitPrice: round2(item.totalPrice / quantity),
        totalPrice: item.totalPrice,
        category: item.category ?? match.category,
        shelfLifeDays: item.shelfLifeDays !== undefined ? item.shelfLifeDays : match.shelfLifeDays,
        openedShelfLifeDays: match.openedShelfLifeDays,
        needsReview: item.checked ? false : match.needsReview && !item.category,
      };
    });
  }

  private async own(receiptId: string, userId: string) {
    const receipt = await this.prisma.receipt.findUnique({ where: { id: receiptId } });
    if (!receipt || receipt.userId !== userId) {
      throw new NotFoundException('Receipt not found');
    }
    return receipt;
  }
}
