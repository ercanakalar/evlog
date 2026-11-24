import { Module } from '@nestjs/common';
import { HomeItemsModule } from '../home-items/home-items.module';
import { OcrModule } from '../receipts/ocr.module';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';

@Module({
  imports: [OcrModule, HomeItemsModule],
  controllers: [ItemsController],
  providers: [ItemsService],
  exports: [ItemsService],
})
export class ItemsModule {}
