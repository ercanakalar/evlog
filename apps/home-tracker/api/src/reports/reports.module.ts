import { Module } from '@nestjs/common';
import { ListingsModule } from '../listings/listings.module';
import { ModerationService } from './moderation.service';
import { ModerationController, ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [ListingsModule],
  controllers: [ReportsController, ModerationController],
  providers: [ReportsService, ModerationService],
})
export class ReportsModule {}
