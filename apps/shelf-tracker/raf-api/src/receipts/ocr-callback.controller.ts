import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Env } from '../config/env.validation';
import { Public } from '../common/decorators/public.decorator';
import { safeEqual } from '../common/utils/crypto';
import { ReceiptsService } from './receipts.service';

/**
 * Machine-to-machine endpoint for the receipt reader. Not user-facing:
 * authenticated with a shared secret instead of a JWT. The body is validated
 * inside ReceiptsService, so it is typed as unknown here on purpose.
 */
@ApiExcludeController()
@Public()
@SkipThrottle()
@Controller('ocr/receipts')
export class OcrCallbackController {
  constructor(
    private readonly receipts: ReceiptsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Post(':receiptId/result')
  @HttpCode(200)
  result(
    @Param('receiptId', ParseUUIDPipe) receiptId: string,
    @Headers('x-ocr-secret') secret: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const expected = this.config.get('OCR_CALLBACK_SECRET', { infer: true });
    if (!expected || !secret || !safeEqual(secret, expected)) {
      throw new UnauthorizedException();
    }
    return this.receipts.applyCallback(receiptId, body);
  }
}
