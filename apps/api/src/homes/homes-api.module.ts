import { Module } from '@nestjs/common';
import { AppliancesModule } from '../appliances/appliances.module';
import { KitchenModule } from '../kitchen/kitchen.module';
import { RatingsModule } from '../ratings/ratings.module';
import { HomesController } from './homes.controller';
import { HomesService } from './homes.service';

@Module({
  imports: [RatingsModule, KitchenModule, AppliancesModule],
  controllers: [HomesController],
  providers: [HomesService],
})
export class HomesModule {}
