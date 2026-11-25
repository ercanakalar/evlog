import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Public()
@SkipThrottle({ default: true, address: true })
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    // Connecting to a hosted database can take a second or more.
    return this.health.check([() => this.db.pingCheck('database', this.prisma, { timeout: 5000 })]);
  }

  /** Whether the API itself runs. Does not touch the database, so a hosted one can go to sleep. */
  @Get('live')
  live() {
    return { status: 'ok' };
  }
}
