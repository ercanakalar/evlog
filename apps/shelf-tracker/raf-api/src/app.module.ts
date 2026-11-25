import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { requestTracker } from './common/guards/request-tracker';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { envSchema } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { HomeItemsModule } from './home-items/home-items.module';
import { InsightsModule } from './insights/insights.module';
import { ItemsModule } from './items/items.module';
import { ListsModule } from './lists/lists.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { StorageModule } from './storage/storage.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: envSchema,
    }),
    ThrottlerModule.forRootAsync({
      imports: [AuthModule],
      inject: [JwtService],
      useFactory: (jwt: JwtService) => [
        { name: 'default', ttl: 60_000, limit: 120, getTracker: (req) => requestTracker(jwt, req) },
        // Per address and route, whoever is asking.
        { name: 'address', ttl: 60_000, limit: 600 },
      ],
    }),
    PrismaModule,
    StorageModule,
    ProductsModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ReceiptsModule,
    ItemsModule,
    HomeItemsModule,
    ListsModule,
    InsightsModule,
  ],
  providers: [
    // Order matters: throttle first, then authenticate.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule {}
