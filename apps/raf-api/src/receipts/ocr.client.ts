import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { Env } from '../config/env.validation';
import { OcrResultDto } from './dto/ocr-result.dto';

export type OcrDispatchResult =
  | { kind: 'parsed'; result: OcrResultDto }
  | { kind: 'accepted' }
  | { kind: 'failed'; error: string };

/**
 * Talks to the receipt reader running on your own machine.
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

  constructor(private readonly config: ConfigService<Env, true>) {}

  async dispatch(input: {
    receiptId: string;
    kind: string;
    image: Buffer;
    mimeType: string;
  }): Promise<OcrDispatchResult> {
    const base = this.config.get('OCR_SERVICE_URL', { infer: true });
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
        return { kind: 'failed', error: `Receipt reader answered ${response.status}` };
      }
      return this.parse(await response.json());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Receipt reader unreachable for ${input.receiptId}: ${message}`);
      return { kind: 'failed', error: 'Receipt reader is unreachable, try again later' };
    }
  }

  /** Validates an untrusted reader payload. */
  async parse(body: unknown): Promise<OcrDispatchResult> {
    const result = plainToInstance(OcrResultDto, body ?? {});
    const errors = await validate(result, { whitelist: true });
    if (errors.length > 0) {
      const detail = errors.map((e) => e.property).join(', ');
      return { kind: 'failed', error: `Reader returned invalid fields: ${detail}` };
    }
    if (result.error) return { kind: 'failed', error: result.error };
    return { kind: 'parsed', result };
  }
}
