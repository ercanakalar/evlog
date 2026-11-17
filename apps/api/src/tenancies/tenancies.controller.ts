import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { type AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import {
  AcceptInviteDto,
  EndTenancyDto,
  InviteTenantDto,
} from './dto/tenancy.dto';
import { TenanciesService } from './tenancies.service';

@ApiTags('tenancies')
@ApiBearerAuth()
@Controller()
export class TenanciesController {
  constructor(private readonly tenancies: TenanciesService) {}

  @Get('homes/:homeId/tenancies')
  list(
    @CurrentUser() user: AuthUser,
    @Param('homeId', ParseUUIDPipe) homeId: string,
  ) {
    return this.tenancies.list(homeId, user.id);
  }

  /** Owner only. Returns an invite code to hand to the tenant. */
  @Post('homes/:homeId/tenancies/invite')
  invite(
    @CurrentUser() user: AuthUser,
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Body() dto: InviteTenantDto,
  ) {
    return this.tenancies.invite(homeId, user.id, dto.startDate);
  }

  @Post('homes/:homeId/tenancies/end')
  @HttpCode(200)
  end(
    @CurrentUser() user: AuthUser,
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Body() dto: EndTenancyDto,
  ) {
    return this.tenancies.end(homeId, user.id, dto.endDate);
  }

  @Post('tenancies/accept')
  @HttpCode(200)
  accept(@CurrentUser() user: AuthUser, @Body() dto: AcceptInviteDto) {
    return this.tenancies.accept(dto.code, user.id);
  }
}
