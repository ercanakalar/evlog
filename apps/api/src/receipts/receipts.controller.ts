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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { type AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { ImageFilePipe } from '../common/pipes/image-file.pipe';
import {
  ListReceiptsQueryDto,
  UpdateReceiptDto,
  UploadReceiptDto,
} from './dto/receipt.dto';
import { ReceiptsService } from './receipts.service';

@ApiTags('receipts')
@ApiBearerAuth()
@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly receipts: ReceiptsService) {}

  /** Upload a receipt photo; it is read by the receipt reader and returned. */
  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile(ImageFilePipe) file: Express.Multer.File,
    @Body() dto: UploadReceiptDto,
  ) {
    return this.receipts.upload(user.id, file, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ListReceiptsQueryDto) {
    return this.receipts.list(user.id, query);
  }

  @Get(':receiptId')
  get(
    @CurrentUser() user: AuthUser,
    @Param('receiptId', ParseUUIDPipe) receiptId: string,
  ) {
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
  rescan(
    @CurrentUser() user: AuthUser,
    @Param('receiptId', ParseUUIDPipe) receiptId: string,
  ) {
    return this.receipts.rescan(receiptId, user.id);
  }

  @Post(':receiptId/confirm')
  @HttpCode(200)
  confirm(
    @CurrentUser() user: AuthUser,
    @Param('receiptId', ParseUUIDPipe) receiptId: string,
  ) {
    return this.receipts.confirm(receiptId, user.id);
  }

  @Delete(':receiptId')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('receiptId', ParseUUIDPipe) receiptId: string,
  ) {
    return this.receipts.remove(receiptId, user.id);
  }

  @Get(':receiptId/image')
  async image(
    @CurrentUser() user: AuthUser,
    @Param('receiptId', ParseUUIDPipe) receiptId: string,
  ) {
    const { stream, mimeType } = await this.receipts.image(receiptId, user.id);
    return new StreamableFile(stream, { type: mimeType, disposition: 'inline' });
  }
}
