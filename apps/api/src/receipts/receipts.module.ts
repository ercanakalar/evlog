import { Module } from '@nestjs/common';
import { KitchenModule } from '../kitchen/kitchen.module';
import { TenanciesModule } from '../tenancies/tenancies.module';
import { OcrCallbackController } from './ocr-callback.controller';
import { OcrClient } from './ocr.client';
import { ReceiptsController } from './receipts.controller';
import { ReceiptsService } from './receipts.service';

@Module({
  imports: [KitchenModule, TenanciesModule],
  controllers: [ReceiptsController, OcrCallbackController],
  providers: [ReceiptsService, OcrClient],
})
export class ReceiptsModule {}
