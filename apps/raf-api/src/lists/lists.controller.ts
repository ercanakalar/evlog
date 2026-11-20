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
import { AddListItemDto, ListNameDto, UpdateListItemDto } from './dto/list.dto';
import { ListsService } from './lists.service';

@ApiTags('lists')
@ApiBearerAuth()
@Controller()
export class ListsController {
  constructor(private readonly lists: ListsService) {}

  /** Every market list with last prices, plus what is running low at home. */
  @Get('lists')
  all(@CurrentUser() user: AuthUser) {
    return this.lists.all(user.id);
  }

  @Post('lists')
  create(@CurrentUser() user: AuthUser, @Body() dto: ListNameDto) {
    return this.lists.create(user.id, dto);
  }

  @Patch('lists/:listId')
  rename(
    @CurrentUser() user: AuthUser,
    @Param('listId', ParseUUIDPipe) listId: string,
    @Body() dto: ListNameDto,
  ) {
    return this.lists.rename(listId, user.id, dto);
  }

  @Delete('lists/:listId')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('listId', ParseUUIDPipe) listId: string) {
    return this.lists.remove(listId, user.id);
  }

  @Post('lists/:listId/items')
  addItem(
    @CurrentUser() user: AuthUser,
    @Param('listId', ParseUUIDPipe) listId: string,
    @Body() dto: AddListItemDto,
  ) {
    return this.lists.addItem(listId, user.id, dto);
  }

  @Patch('list-items/:itemId')
  updateItem(
    @CurrentUser() user: AuthUser,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateListItemDto,
  ) {
    return this.lists.updateItem(itemId, user.id, dto);
  }

  @Delete('list-items/:itemId')
  @HttpCode(204)
  removeItem(@CurrentUser() user: AuthUser, @Param('itemId', ParseUUIDPipe) itemId: string) {
    return this.lists.removeItem(itemId, user.id);
  }
}
