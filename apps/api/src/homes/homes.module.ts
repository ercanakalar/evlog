import { Global, Module } from '@nestjs/common';
import { HomeAccessService } from './home-access.service';

/** Access control is needed by every feature module, so it is global. */
@Global()
@Module({
  providers: [HomeAccessService],
  exports: [HomeAccessService],
})
export class HomeAccessModule {}
