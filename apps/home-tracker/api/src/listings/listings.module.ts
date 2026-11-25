import { Module } from '@nestjs/common';
import { RatingsModule } from '../ratings/ratings.module';
import {
  ListingsController,
  SharedListingsController,
} from './listings.controller';
import { ListingsService } from './listings.service';
import { SahibindenProvider } from './providers/sahibinden.provider';

@Module({
  imports: [RatingsModule],
  controllers: [ListingsController, SharedListingsController],
  providers: [ListingsService, SahibindenProvider],
  exports: [ListingsService],
})
export class ListingsModule {}
