import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from '../auth/auth.module';
import { EventsGateway } from './events.gateway';
import { EventsService } from './events.service';
import { LiveChangesInterceptor } from './live-changes.interceptor';

/** Live updates for everyone in a household. */
@Global()
@Module({
  imports: [AuthModule],
  providers: [EventsService, EventsGateway, { provide: APP_INTERCEPTOR, useClass: LiveChangesInterceptor }],
  exports: [EventsService],
})
export class EventsModule {}
