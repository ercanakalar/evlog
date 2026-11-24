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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { type AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import {
  CreateShoppingItemDto,
  MarketPriceQueryDto,
  UpdatePantryItemDto,
  UpdateShoppingItemDto,
} from './dto/kitchen.dto';
import { KitchenService } from './kitchen.service';

@ApiTags('kitchen')
@ApiBearerAuth()
@Controller()
export class KitchenController {
  constructor(private readonly kitchen: KitchenService) {}

  /** Last scan, running-low items and price watch for the Kitchen tab. */
  @Get('homes/:homeId/kitchen')
  summary(
    @CurrentUser() user: AuthUser,
    @Param('homeId', ParseUUIDPipe) homeId: string,
  ) {
    return this.kitchen.summary(homeId, user.id);
  }

  @Get('homes/:homeId/pantry')
  pantry(
    @CurrentUser() user: AuthUser,
    @Param('homeId', ParseUUIDPipe) homeId: string,
  ) {
    return this.kitchen.pantry(homeId, user.id);
  }

  @Patch('pantry/:itemId')
  updatePantryItem(
    @CurrentUser() user: AuthUser,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdatePantryItemDto,
  ) {
    return this.kitchen.updatePantryItem(itemId, user.id, dto);
  }

  @Get('homes/:homeId/shopping-list')
  shoppingList(
    @CurrentUser() user: AuthUser,
    @Param('homeId', ParseUUIDPipe) homeId: string,
  ) {
    return this.kitchen.shoppingList(homeId, user.id);
  }

  @Post('homes/:homeId/shopping-list')
  addShoppingItem(
    @CurrentUser() user: AuthUser,
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Body() dto: CreateShoppingItemDto,
  ) {
    return this.kitchen.addShoppingItem(homeId, user.id, dto.name);
  }

  @Patch('shopping-list/:itemId')
  setDone(
    @CurrentUser() user: AuthUser,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateShoppingItemDto,
  ) {
    return this.kitchen.setShoppingItemDone(itemId, user.id, dto.done);
  }

  @Delete('shopping-list/:itemId')
  @HttpCode(204)
  removeShoppingItem(
    @CurrentUser() user: AuthUser,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.kitchen.removeShoppingItem(itemId, user.id);
  }

  /** Anonymous average prices across all households. */
  @Get('market/prices')
  marketPrices(@Query() query: MarketPriceQueryDto) {
    return this.kitchen.marketPrices(query);
  }
}
