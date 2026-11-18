import { Module } from '@nestjs/common';
import { ItemsModule } from '../items/items.module';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';

@Module({
  imports: [ItemsModule],
  controllers: [InsightsController],
  providers: [InsightsService],
})
export class InsightsModule {}
