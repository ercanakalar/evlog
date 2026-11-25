import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppliancesModule } from './appliances/appliances.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { ConditionRecordsModule } from './condition-records/condition-records.module';
import { envSchema } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { HomesModule } from './homes/homes-api.module';
import { HomeAccessModule } from './homes/homes.module';
import { KitchenModule } from './kitchen/kitchen.module';
import { ListingsModule } from './listings/listings.module';
import { PrismaModule } from './prisma/prisma.module';
import { RatingsModule } from './ratings/ratings.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { ReportsModule } from './reports/reports.module';
import { StorageModule } from './storage/storage.module';
import { TenanciesModule } from './tenancies/tenancies.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: envSchema,
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    PrismaModule,
    StorageModule,
    HomeAccessModule,
    HealthModule,
    AuthModule,
    UsersModule,
    HomesModule,
    TenanciesModule,
    ConditionRecordsModule,
    ReceiptsModule,
    RatingsModule,
    ListingsModule,
    KitchenModule,
    AppliancesModule,
    ReportsModule,
  ],
  providers: [
    // Order matters: throttle first, then authenticate.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule {}
