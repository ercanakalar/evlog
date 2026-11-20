import { Module } from '@nestjs/common';
import { OcrClient } from './ocr.client';

/** The receipt reader client, shared by receipts and pack-label scanning. */
@Module({
  providers: [OcrClient],
  exports: [OcrClient],
})
export class OcrModule {}
