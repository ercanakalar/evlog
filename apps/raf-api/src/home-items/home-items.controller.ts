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
import { CreateHomeItemDto, UpdateHomeItemDto } from './dto/home-item.dto';
import { HomeItemsService } from './home-items.service';

/** "At home": products the user counts; saved receipts raise matching counts. */
@ApiTags('home-items')
@ApiBearerAuth()
@Controller('home-items')
export class HomeItemsController {
  constructor(private readonly homeItems: HomeItemsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.homeItems.list(user.id);
  }

  /** One product with its brands and pack sizes. */
  @Get(':itemId')
  get(@CurrentUser() user: AuthUser, @Param('itemId', ParseUUIDPipe) itemId: string) {
    return this.homeItems.get(itemId, user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateHomeItemDto) {
    return this.homeItems.create(user.id, dto);
  }

  @Patch(':itemId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateHomeItemDto,
  ) {
    return this.homeItems.update(itemId, user.id, dto);
  }

  @Delete(':itemId')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('itemId', ParseUUIDPipe) itemId: string) {
    return this.homeItems.remove(itemId, user.id);
  }
}
