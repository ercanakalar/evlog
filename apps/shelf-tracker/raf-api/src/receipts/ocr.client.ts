import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { Env } from '../config/env.validation';
import { ReaderService } from '../reader/reader.service';
import { LabelResultDto, OcrResultDto } from './dto/ocr-result.dto';
import { readError, type ReadError } from './read-error';

export type OcrDispatchResult =
  | { kind: 'parsed'; result: OcrResultDto }
  | { kind: 'accepted' }
  | { kind: 'failed'; error: ReadError };

/**
 * Reads photos with the reader built into this API or, when OCR_SERVICE_URL
 * is set, with a separate receipt reader (services/receipt-reader):
 *
 *   POST {OCR_SERVICE_URL}/v1/receipts/parse   (multipart/form-data)
 *     Authorization: Bearer {OCR_SERVICE_TOKEN}
 *     file          the image
 *     receiptId     our id, echo it back in the callback
 *     kind          always GROCERY for Raf
 *     callbackUrl   where to POST the result if you answer 202
 *
 *   200 -> OcrResultDto body, applied immediately
 *   202 -> processed later; POST OcrResultDto to callbackUrl with
 *          header X-Ocr-Secret: {OCR_CALLBACK_SECRET}
 */
@Injectable()
export class OcrClient {
  private readonly logger = new Logger(OcrClient.name);

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly reader: ReaderService,
  ) {}

  async dispatch(input: {
    receiptId: string;
    kind: string;
    image: Buffer;
    mimeType: string;
  }): Promise<OcrDispatchResult> {
    const base = this.config.get('OCR_SERVICE_URL', { infer: true });
    if (!base) return this.readHere(input.receiptId, input.image);
    const publicUrl = this.config.get('PUBLIC_API_URL', { infer: true });
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(input.image)], { type: input.mimeType }), 'receipt');
    form.append('receiptId', input.receiptId);
    form.append('kind', input.kind);
    form.append(
      'callbackUrl',
      new URL(`/api/v1/ocr/receipts/${input.receiptId}/result`, publicUrl).toString(),
    );

    try {
      const response = await fetch(new URL('/v1/receipts/parse', base), {
        method: 'POST',
        body: form,
        headers: {
          Authorization: `Bearer ${this.config.get('OCR_SERVICE_TOKEN', { infer: true })}`,
        },
        signal: AbortSignal.timeout(this.config.get('OCR_TIMEOUT_MS', { infer: true })),
      });
      if (response.status === 202) return { kind: 'accepted' };
      if (!response.ok) {
        this.logger.warn(`Receipt reader answered ${response.status} for ${input.receiptId}`);
        return { kind: 'failed', error: 'READER_UNAVAILABLE' };
      }
      return this.parse(await response.json());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Receipt reader unreachable for ${input.receiptId}: ${message}`);
      return { kind: 'failed', error: 'READER_UNAVAILABLE' };
    }
  }

  /**
   * Reads a photo of a product pack:  POST {OCR_SERVICE_URL}/v1/labels/parse
   * (multipart "file"). Returns what the reader found, or an error message.
   */
  async readLabel(image: Buffer, mimeType: string): Promise<LabelResultDto> {
    const base = this.config.get('OCR_SERVICE_URL', { infer: true });
    if (!base) return this.readLabelHere(image);
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(image)], { type: mimeType }), 'label');
    try {
      const response = await fetch(new URL('/v1/labels/parse', base), {
        method: 'POST',
        body: form,
        headers: { Authorization: `Bearer ${this.config.get('OCR_SERVICE_TOKEN', { infer: true })}` },
        signal: AbortSignal.timeout(this.config.get('OCR_TIMEOUT_MS', { infer: true })),
      });
      if (!response.ok) return { error: 'READER_UNAVAILABLE' };
      return await this.parseLabel(await response.json());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Receipt reader unreachable for a pack label: ${message}`);
      return { error: 'READER_UNAVAILABLE' };
    }
  }

  private async readHere(receiptId: string, image: Buffer): Promise<OcrDispatchResult> {
    try {
      return await this.parse(await this.reader.readReceipt(image));
    } catch (error) {
      this.logger.error(`Could not read receipt ${receiptId}: ${String(error)}`);
      return { kind: 'failed', error: 'UNREADABLE' };
    }
  }

  private async readLabelHere(image: Buffer): Promise<LabelResultDto> {
    try {
      return await this.parseLabel(await this.reader.readLabel(image));
    } catch (error) {
      this.logger.error(`Could not read a pack label: ${String(error)}`);
      return { error: 'UNREADABLE' };
    }
  }

  private async parseLabel(body: unknown): Promise<LabelResultDto> {
    const result = plainToInstance(LabelResultDto, body ?? {});
    const errors = await validate(result, { whitelist: true });
    if (errors.length > 0) return { error: 'UNREADABLE' };
    if (result.error) result.error = readError(result.error);
    return result;
  }

  /** Validates an untrusted reader payload. */
  async parse(body: unknown): Promise<OcrDispatchResult> {
    const result = plainToInstance(OcrResultDto, body ?? {});
    const errors = await validate(result, { whitelist: true });
    if (errors.length > 0) {
      const detail = errors.map((e) => e.property).join(', ');
      this.logger.warn(`Reader returned invalid fields: ${detail}`);
      return { kind: 'failed', error: 'UNREADABLE' };
    }
    if (result.error) return { kind: 'failed', error: readError(result.error) };
    return { kind: 'parsed', result };
  }
}
