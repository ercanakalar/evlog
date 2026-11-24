import { Module } from '@nestjs/common';
import { ConditionRecordsController } from './condition-records.controller';
import { ConditionRecordsService } from './condition-records.service';

@Module({
  controllers: [ConditionRecordsController],
  providers: [ConditionRecordsService],
})
export class ConditionRecordsModule {}
