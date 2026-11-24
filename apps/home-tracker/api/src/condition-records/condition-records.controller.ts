import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { type AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { ImageFilePipe } from '../common/pipes/image-file.pipe';
import { ConditionRecordsService } from './condition-records.service';
import {
  CreateConditionSessionDto,
  UploadPhotoDto,
} from './dto/condition.dto';

@ApiTags('condition-records')
@ApiBearerAuth()
@Controller()
export class ConditionRecordsController {
  constructor(private readonly records: ConditionRecordsService) {}

  @Get('homes/:homeId/condition-sessions')
  list(
    @CurrentUser() user: AuthUser,
    @Param('homeId', ParseUUIDPipe) homeId: string,
  ) {
    return this.records.list(homeId, user.id);
  }

  /** Start a photo session (move-in, move-out or periodic). */
  @Post('homes/:homeId/condition-sessions')
  create(
    @CurrentUser() user: AuthUser,
    @Param('homeId', ParseUUIDPipe) homeId: string,
    @Body() dto: CreateConditionSessionDto,
  ) {
    return this.records.create(homeId, user.id, dto.type);
  }

  @Get('condition-sessions/:sessionId')
  get(
    @CurrentUser() user: AuthUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.records.get(sessionId, user.id);
  }

  @Post('condition-sessions/:sessionId/photos')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  addPhoto(
    @CurrentUser() user: AuthUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @UploadedFile(ImageFilePipe)
    file: Express.Multer.File,
    @Body() dto: UploadPhotoDto,
  ) {
    return this.records.addPhoto(sessionId, user.id, file, dto);
  }

  /** Freeze the photos. Counts as the caller's confirmation. */
  @Post('condition-sessions/:sessionId/lock')
  @HttpCode(200)
  lock(
    @CurrentUser() user: AuthUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.records.lock(sessionId, user.id);
  }

  /** The other party agrees the photos show how the home looked. */
  @Post('condition-sessions/:sessionId/confirm')
  @HttpCode(200)
  confirm(
    @CurrentUser() user: AuthUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.records.confirm(sessionId, user.id);
  }

  @Get('condition-photos/:photoId/file')
  async file(
    @CurrentUser() user: AuthUser,
    @Param('photoId', ParseUUIDPipe) photoId: string,
  ) {
    const { stream, mimeType } = await this.records.photoFile(photoId, user.id);
    return new StreamableFile(stream, {
      type: mimeType,
      disposition: 'inline',
    });
  }
}
