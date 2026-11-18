import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { type AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { ListItemsQueryDto, UpdateItemDto } from './dto/item.dto';
import { ItemsService } from './items.service';

/** Products from saved receipts, with their countdown. */
@ApiTags('items')
@ApiBearerAuth()
@Controller('items')
export class ItemsController {
  constructor(private readonly items: ItemsService) {}

  @Get()
  shelf(@CurrentUser() user: AuthUser, @Query() query: ListItemsQueryDto) {
    return this.items.shelf(user.id, query);
  }

  @Get(':itemId')
  get(@CurrentUser() user: AuthUser, @Param('itemId', ParseUUIDPipe) itemId: string) {
    return this.items.get(itemId, user.id);
  }

  @Patch(':itemId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.items.update(itemId, user.id, dto);
  }
}
