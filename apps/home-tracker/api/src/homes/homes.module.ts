import { Global, Module } from '@nestjs/common';
import { HomeAccessService } from './home-access.service';
import { HomeRemovalService } from './home-removal.service';

/** Access control and deleting homes are needed by several feature modules, so it is global. */
@Global()
@Module({
  providers: [HomeAccessService, HomeRemovalService],
  exports: [HomeAccessService, HomeRemovalService],
})
export class HomeAccessModule {}
