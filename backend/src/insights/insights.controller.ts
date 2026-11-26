import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { type AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { ClockQueryDto, SpendingQueryDto } from './dto/insights.dto';
import { InsightsService } from './insights.service';

@ApiTags('insights')
@ApiBearerAuth()
@Controller('insights')
export class InsightsController {
  constructor(private readonly insights: InsightsService) {}

  /** This month's spending, products to use soon and the last trip. */
  @Get('home')
  home(@CurrentUser() user: AuthUser, @Query() query: ClockQueryDto) {
    return this.insights.home(user.id, query.utcOffset);
  }

  @Get('spending')
  spending(@CurrentUser() user: AuthUser, @Query() query: SpendingQueryDto) {
    return this.insights.spending(user.id, query);
  }
}
