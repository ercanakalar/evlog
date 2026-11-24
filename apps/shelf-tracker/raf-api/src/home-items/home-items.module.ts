import { Module } from '@nestjs/common';
import { HomeItemsController } from './home-items.controller';
import { HomeItemsService } from './home-items.service';

@Module({
  controllers: [HomeItemsController],
  providers: [HomeItemsService],
  exports: [HomeItemsService],
})
export class HomeItemsModule {}
