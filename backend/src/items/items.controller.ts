import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ImageFilePipe } from '../common/pipes/image-file.pipe';
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
    return this.items.shelf(user.householdId, query);
  }

  @Get(':itemId')
  get(@CurrentUser() user: AuthUser, @Param('itemId', ParseUUIDPipe) itemId: string) {
    return this.items.get(itemId, user.householdId);
  }

  /** Photo of the pack ("file"): reads the printed use-by / best-before date and uses it. */
  @Post(':itemId/label')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  readLabel(
    @CurrentUser() user: AuthUser,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @UploadedFile(ImageFilePipe) file: Express.Multer.File,
  ) {
    return this.items.readLabel(itemId, user, file.buffer, file.mimetype);
  }

  @Patch(':itemId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.items.update(itemId, user, dto);
  }
}
