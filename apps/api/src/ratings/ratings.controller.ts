import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { type AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { SubmitRatingDto } from './dto/rating.dto';
import { RatingsService } from './ratings.service';

@ApiTags('ratings')
@ApiBearerAuth()
@Controller('homes/:homeId/ratings')
export class RatingsController {
  constructor(private readonly ratings: RatingsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Param('homeId', ParseUUIDPipe) homeId: string,
  ) {
    return this.ratings.list(homeId, user.id);
  }

  /** Tenant only: which categories are backed by evidence. */
  @Get('eligibility')
  eligibility(
    @CurrentUser() user: AuthUser,
    @Param('homeId', ParseUUIDPipe) homeId: string,
  ) {
    return this.ratings.eligibility(homeId, user.id);
  }

  /** Tenant only: submit the verified rating for the current tenancy. */
  @Post()
  submit(
    @CurrentUser() user: AuthUser,
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Body() dto: SubmitRatingDto,
  ) {
    return this.ratings.submit(homeId, user.id, dto);
  }
}
