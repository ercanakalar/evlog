import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { type AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateHomeDto, UpdateHomeDto } from './dto/home.dto';
import { HomesService } from './homes.service';

@ApiTags('homes')
@ApiBearerAuth()
@Controller('homes')
export class HomesController {
  constructor(private readonly homes: HomesService) {}

  /** Register a home. The caller becomes its owner. */
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateHomeDto) {
    return this.homes.create(user.id, dto);
  }

  @Get(':homeId')
  dashboard(
    @CurrentUser() user: AuthUser,
    @Param('homeId', ParseUUIDPipe) homeId: string,
  ) {
    return this.homes.dashboard(homeId, user.id);
  }

  @Patch(':homeId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Body() dto: UpdateHomeDto,
  ) {
    return this.homes.update(homeId, user.id, dto);
  }
}
