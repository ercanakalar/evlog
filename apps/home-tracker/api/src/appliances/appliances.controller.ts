import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { type AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import {
  CompleteTaskDto,
  CreateApplianceDto,
  CreateTaskDto,
  UpdateApplianceDto,
} from './dto/appliance.dto';
import { UpkeepService } from './upkeep.service';

@ApiTags('upkeep')
@ApiBearerAuth()
@Controller()
export class AppliancesController {
  constructor(private readonly upkeep: UpkeepService) {}

  /** The Upkeep tab: most urgent task plus every appliance. */
  @Get('homes/:homeId/upkeep')
  async overview(
    @CurrentUser() user: AuthUser,
    @Param('homeId', ParseUUIDPipe) homeId: string,
  ) {
    const appliances = await this.upkeep.list(homeId, user.id);
    return { next: await this.upkeep.nextDue(homeId), appliances };
  }

  @Post('homes/:homeId/appliances')
  create(
    @CurrentUser() user: AuthUser,
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Body() dto: CreateApplianceDto,
  ) {
    return this.upkeep.create(homeId, user.id, dto);
  }

  @Patch('appliances/:applianceId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('applianceId', ParseUUIDPipe) applianceId: string,
    @Body() dto: UpdateApplianceDto,
  ) {
    return this.upkeep.update(applianceId, user.id, dto);
  }

  @Delete('appliances/:applianceId')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('applianceId', ParseUUIDPipe) applianceId: string,
  ) {
    return this.upkeep.remove(applianceId, user.id);
  }

  @Post('appliances/:applianceId/tasks')
  addTask(
    @CurrentUser() user: AuthUser,
    @Param('applianceId', ParseUUIDPipe) applianceId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.upkeep.addTask(applianceId, user.id, dto);
  }

  @Post('maintenance-tasks/:taskId/done')
  @HttpCode(200)
  complete(
    @CurrentUser() user: AuthUser,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: CompleteTaskDto,
  ) {
    return this.upkeep.complete(taskId, user.id, dto);
  }

  @Get('maintenance-tasks/:taskId/history')
  history(
    @CurrentUser() user: AuthUser,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.upkeep.history(taskId, user.id);
  }
}
