import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { HomeAccessService } from '../homes/home-access.service';
import { KitchenService } from '../kitchen/kitchen.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { TenanciesService } from '../tenancies/tenancies.service';
import { sha256 } from '../common/utils/crypto';
import { normalizeProductName } from '../common/utils/normalize';
import { OcrItemDto, OcrResultDto } from './dto/ocr-result.dto';
import {
  ListReceiptsQueryDto,
  UpdateReceiptDto,
  UploadReceiptDto,
} from './dto/receipt.dto';
import { OcrClient, OcrDispatchResult } from './ocr.client';

const withItems = {
  items: { orderBy: { position: 'asc' } },
} satisfies Prisma.ReceiptInclude;

const toItems = (items: OcrItemDto[]) =>
  items.map((item, position) => {
    const quantity = item.quantity ?? 1;
    return {
      position,
      name: item.name.trim(),
      normalizedName: normalizeProductName(item.name),
      quantity,
      unit: item.unit,
      unitPrice: item.unitPrice ?? Math.round((item.totalPrice / quantity) * 100) / 100,
      totalPrice: item.totalPrice,
    };
  });

@Injectable()
export class ReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: HomeAccessService,
    private readonly storage: StorageService,
    private readonly ocr: OcrClient,
    private readonly kitchen: KitchenService,
    private readonly tenancies: TenanciesService,
  ) {}

  /**
   * Stores the image, sends it to the reader and returns the receipt. When the
   * reader answers synchronously the response already contains the fields.
   */
  async upload(userId: string, file: Express.Multer.File, dto: UploadReceiptDto) {
    if (dto.homeId) await this.access.get(dto.homeId, userId);
    const hash = sha256(file.buffer);
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
    const imageKey = await this.storage.save('receipts', file.buffer, file.mimetype);
    const receipt = await this.prisma.receipt
      .create({
        data: {
          userId,
          homeId: dto.homeId,
          kind: dto.kind,
          imageKey,
          mimeType: file.mimetype,
          sha256: hash,
        },
      })
      .catch(async (error: unknown) => {
        // e.g. the account was deleted meanwhile: leave no photo behind.
        await this.storage.remove([imageKey]);
        throw error;
      });
    return this.scan(receipt.id, file.buffer);
  }

  /** Sends the stored image to the reader again (after a failure). */
  async rescan(receiptId: string, userId: string) {
    const receipt = await this.own(receiptId, userId);
    if (receipt.status === 'CONFIRMED') {
      throw new ConflictException('Confirmed receipts cannot be rescanned');
    }
    const chunks: Buffer[] = [];
    for await (const chunk of await this.storage.open(receipt.imageKey)) {
      chunks.push(chunk as Buffer);
    }
    return this.scan(receiptId, Buffer.concat(chunks));
  }

  /** Called by the reader's callback. */
  async applyCallback(receiptId: string, body: unknown) {
    const receipt = await this.prisma.receipt.findUnique({ where: { id: receiptId } });
    if (!receipt) throw new NotFoundException('Receipt not found');
    if (receipt.status !== 'PROCESSING' && receipt.status !== 'PENDING') {
      throw new ConflictException('Receipt is not waiting for a result');
    }
    await this.apply(receiptId, await this.ocr.parse(body));
    return { ok: true };
  }

  list(userId: string, query: ListReceiptsQueryDto) {
    return this.prisma.receipt.findMany({
      where: {
        userId,
        homeId: query.homeId,
        kind: query.kind,
        status: query.status,
      },
      orderBy: { id: 'desc' },
      take: query.take,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      omit: { imageKey: true, ocrRaw: true },
      include: { _count: { select: { items: true } } },
    });
  }

  async get(receiptId: string, userId: string) {
    await this.own(receiptId, userId);
    return this.prisma.receipt.findUniqueOrThrow({
      where: { id: receiptId },
      include: withItems,
      omit: { imageKey: true },
    });
  }

  async update(receiptId: string, userId: string, dto: UpdateReceiptDto) {
    const receipt = await this.own(receiptId, userId);
    if (receipt.status === 'CONFIRMED') {
      throw new ConflictException('Confirmed receipts cannot be edited');
    }
    const { items, issuedAt, ...fields } = dto;
    return this.prisma.$transaction(async (tx) => {
      if (items) {
        await tx.receiptItem.deleteMany({ where: { receiptId } });
        await tx.receiptItem.createMany({
          data: toItems(items).map((item) => ({ ...item, receiptId })),
        });
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
        omit: { imageKey: true },
      });
    });
  }

  /**
   * The user vouches the fields match the paper receipt. Only confirmed
   * receipts feed the kitchen, price data and rating evidence.
   */
  async confirm(receiptId: string, userId: string) {
    const receipt = await this.own(receiptId, userId);
    if (receipt.status === 'CONFIRMED') return this.get(receiptId, userId);
    if (receipt.status !== 'PARSED') {
      throw new ConflictException('Wait for the scan, or fill the fields in manually');
    }
    if (!receipt.issuedAt || receipt.totalAmount === null) {
      throw new BadRequestException('Date and total are required before confirming');
    }
    if (receipt.issuedAt > new Date()) {
      throw new BadRequestException('Receipt date is in the future');
    }
    await this.prisma.receipt.update({
      where: { id: receiptId, status: 'PARSED' },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
    });

    if (receipt.homeId) {
      if (receipt.kind === 'GROCERY') {
        await this.kitchen.ingestReceipt(receiptId);
      }
      if (receipt.kind === 'RENT') {
        const tenancy = await this.prisma.tenancy.findFirst({
          where: { homeId: receipt.homeId, tenantId: userId, status: 'ACTIVE' },
        });
        if (tenancy) await this.tenancies.refreshVerification(tenancy.id);
      }
    }
    return this.get(receiptId, userId);
  }

  async remove(receiptId: string, userId: string) {
    const receipt = await this.own(receiptId, userId);
    const usedAsEvidence = await this.prisma.ratingEvidence.count({ where: { receiptId } });
    if (usedAsEvidence > 0) {
      throw new ConflictException('This receipt backs a submitted rating');
    }
    await this.prisma.receipt.delete({ where: { id: receipt.id } });
    await this.storage.remove([receipt.imageKey]);
  }

  async image(receiptId: string, userId: string) {
    const receipt = await this.own(receiptId, userId);
    return { stream: await this.storage.open(receipt.imageKey), mimeType: receipt.mimeType };
  }

  private async scan(receiptId: string, image: Buffer) {
    const receipt = await this.prisma.receipt.update({
      where: { id: receiptId },
      data: { status: 'PROCESSING', ocrError: null },
    });
    const outcome = await this.ocr.dispatch({
      receiptId,
      kind: receipt.kind,
      image,
      mimeType: receipt.mimeType,
    });
    await this.apply(receiptId, outcome);
    return this.prisma.receipt.findUniqueOrThrow({
      where: { id: receiptId },
      include: withItems,
      omit: { imageKey: true },
    });
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
    const total =
      result.total ?? result.items.reduce((sum, item) => sum + item.totalPrice, 0);
    await this.prisma.$transaction([
      this.prisma.receiptItem.deleteMany({ where: { receiptId } }),
      this.prisma.receiptItem.createMany({
        data: toItems(result.items).map((item) => ({ ...item, receiptId })),
      }),
      this.prisma.receipt.update({
        where: { id: receiptId },
        data: {
          status: 'PARSED',
          merchantName: result.merchantName,
          issuedAt: result.issuedAt ? new Date(result.issuedAt) : undefined,
          totalAmount: Math.round(total * 100) / 100,
          currency: result.currency ?? 'TRY',
          ocrRaw: JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue,
          ocrError: null,
        },
      }),
    ]);
  }

  private async own(receiptId: string, userId: string) {
    const receipt = await this.prisma.receipt.findUnique({ where: { id: receiptId } });
    if (!receipt || receipt.userId !== userId) {
      throw new NotFoundException('Receipt not found');
    }
    return receipt;
  }
}
