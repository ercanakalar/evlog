import { Module } from '@nestjs/common';
import { HomeItemsModule } from '../home-items/home-items.module';
import { ItemsModule } from '../items/items.module';
import { OcrCallbackController } from './ocr-callback.controller';
import { OcrModule } from './ocr.module';
import { ReceiptsController } from './receipts.controller';
import { ReceiptsService } from './receipts.service';

@Module({
  imports: [HomeItemsModule, ItemsModule, OcrModule],
  controllers: [ReceiptsController, OcrCallbackController],
  providers: [ReceiptsService],
})
export class ReceiptsModule {}
