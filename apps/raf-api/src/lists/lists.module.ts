import { Module } from '@nestjs/common';
import { HomeItemsModule } from '../home-items/home-items.module';
import { ListsController } from './lists.controller';
import { ListsService } from './lists.service';

@Module({
  imports: [HomeItemsModule],
  controllers: [ListsController],
  providers: [ListsService],
  exports: [ListsService],
})
export class ListsModule {}
