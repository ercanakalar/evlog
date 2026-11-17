import { Module } from '@nestjs/common';
import { AppliancesController } from './appliances.controller';
import { UpkeepService } from './upkeep.service';

@Module({
  controllers: [AppliancesController],
  providers: [UpkeepService],
  exports: [UpkeepService],
})
export class AppliancesModule {}
