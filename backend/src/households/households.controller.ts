import { Body, Controller, Delete, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { type AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { JoinHouseholdDto } from './dto/household.dto';
import { HouseholdsService } from './households.service';

/** The people who share one home's receipts, shelf, at-home counts, lists and spending. */
@ApiTags('household')
@ApiBearerAuth()
@Controller('household')
export class HouseholdsController {
  constructor(private readonly households: HouseholdsService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.households.get(user);
  }

  /** A code someone else types in to join, valid for a day and for one person. */
  @Post('invite')
  @HttpCode(200)
  invite(@CurrentUser() user: AuthUser) {
    return this.households.invite(user);
  }

  @Delete('invite')
  cancelInvite(@CurrentUser() user: AuthUser) {
    return this.households.cancelInvite(user);
  }

  /** Few tries: a code must not be found by guessing. */
  @Post('join')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  join(@CurrentUser() user: AuthUser, @Body() dto: JoinHouseholdDto) {
    return this.households.join(user, dto.code);
  }

  @Post('leave')
  @HttpCode(200)
  leave(@CurrentUser() user: AuthUser) {
    return this.households.leave(user);
  }
}
