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
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { type AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { ImageFilesPipe } from '../common/pipes/image-file.pipe';
import { ImagePartQueryDto } from './dto/image-part.dto';
import { ListReceiptsQueryDto, UpdateReceiptDto } from './dto/receipt.dto';
import { ReceiptsService } from './receipts.service';

/** Most long receipts fit in this many photos. */
const MAX_PARTS = 6;

@ApiTags('receipts')
@ApiBearerAuth()
@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly receipts: ReceiptsService) {}

  /**
   * Upload a receipt photo as `files`. A long receipt is sent as several
   * `files`, top part first; the parts are read and joined into one receipt.
   */
  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', MAX_PARTS))
  upload(
    @CurrentUser() user: AuthUser,
    @UploadedFiles(ImageFilesPipe) files: Express.Multer.File[],
  ) {
    return this.receipts.upload(user.id, files);
  }

  /** Trips, newest first; filter by market or date range. */
  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ListReceiptsQueryDto) {
    return this.receipts.list(user.id, query);
  }

  /** Markets the user has saved receipts from, most visited first. */
  @Get('markets')
  markets(@CurrentUser() user: AuthUser) {
    return this.receipts.markets(user.id);
  }

  @Get(':receiptId')
  get(@CurrentUser() user: AuthUser, @Param('receiptId', ParseUUIDPipe) receiptId: string) {
    return this.receipts.get(receiptId, user.id);
  }

  @Patch(':receiptId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('receiptId', ParseUUIDPipe) receiptId: string,
    @Body() dto: UpdateReceiptDto,
  ) {
    return this.receipts.update(receiptId, user.id, dto);
  }

  @Post(':receiptId/rescan')
  @HttpCode(200)
  rescan(@CurrentUser() user: AuthUser, @Param('receiptId', ParseUUIDPipe) receiptId: string) {
    return this.receipts.rescan(receiptId, user.id);
  }

  /** Save the reviewed receipt: starts countdowns and updates at-home counts. */
  @Post(':receiptId/confirm')
  @HttpCode(200)
  confirm(@CurrentUser() user: AuthUser, @Param('receiptId', ParseUUIDPipe) receiptId: string) {
    return this.receipts.confirm(receiptId, user.id);
  }

  @Delete(':receiptId')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('receiptId', ParseUUIDPipe) receiptId: string) {
    return this.receipts.remove(receiptId, user.id);
  }

  @Get(':receiptId/image')
  async image(
    @CurrentUser() user: AuthUser,
    @Param('receiptId', ParseUUIDPipe) receiptId: string,
    @Query() query: ImagePartQueryDto,
  ) {
    const { stream, mimeType } = await this.receipts.image(receiptId, user.id, query.part);
    return new StreamableFile(stream, { type: mimeType, disposition: 'inline' });
  }
}
