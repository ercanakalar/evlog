import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { type AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import {
  CreateReportDto,
  CreateSharedReportDto,
  ListReportsQueryDto,
  ResolveReportDto,
} from './dto/report.dto';
import { ModerationService } from './moderation.service';
import { ModeratorGuard } from './moderator.guard';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Controller()
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  /** Report a rating or a condition photo of a home you own or rent. */
  @ApiBearerAuth()
  @Post('reports')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReportDto) {
    return this.reports.create(user.id, dto);
  }

  /** Report a shared listing, or something in it, through its share link. */
  @Public()
  @Post('shared/listings/:token/reports')
  createShared(@Param('token') token: string, @Body() dto: CreateSharedReportDto) {
    return this.reports.createShared(token, dto);
  }
}

@ApiTags('moderation')
@ApiBearerAuth()
@UseGuards(ModeratorGuard)
@Controller('moderation')
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  @Get('reports')
  list(@Query() query: ListReportsQueryDto) {
    return this.moderation.list(query);
  }

  @Post('reports/:reportId/resolve')
  @HttpCode(200)
  resolve(
    @CurrentUser() user: AuthUser,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() dto: ResolveReportDto,
  ) {
    return this.moderation.resolve(reportId, user.id, dto);
  }

  @Get('photos/:photoId/file')
  async photo(@Param('photoId', ParseUUIDPipe) photoId: string) {
    const { stream, mimeType } = await this.moderation.photo(photoId);
    return new StreamableFile(stream, { type: mimeType, disposition: 'inline' });
  }
}
