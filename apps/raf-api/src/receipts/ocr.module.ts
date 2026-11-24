import { Module } from '@nestjs/common';
import { ReaderService } from '../reader/reader.service';
import { OcrClient } from './ocr.client';

/** The receipt reader, shared by receipts and pack-label scanning. */
@Module({
  providers: [OcrClient, ReaderService],
  exports: [OcrClient],
})
export class OcrModule {}
