import {
  FileTypeValidator,
  HttpStatus,
  Injectable,
  MaxFileSizeValidator,
  ParseFilePipe,
  PipeTransform,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.validation';

export const IMAGE_MIME_TYPES = /^image\/(jpeg|png|webp|heic|heif)$/;

/**
 * Validates an uploaded image by size and by its real (magic-number) type,
 * not the client-supplied content type. Use as `@UploadedFile(ImageFilePipe)`.
 */
@Injectable()
export class ImageFilePipe implements PipeTransform<Express.Multer.File> {
  private readonly pipe: ParseFilePipe;

  constructor(config: ConfigService<Env, true>) {
    this.pipe = new ParseFilePipe({
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      validators: [
        new MaxFileSizeValidator({
          maxSize: config.get('MAX_UPLOAD_MB', { infer: true }) * 1024 * 1024,
        }),
        new FileTypeValidator({
          fileType: IMAGE_MIME_TYPES,
          overrideMimeType: true,
        }),
      ],
    });
  }

  transform(file: Express.Multer.File): Promise<Express.Multer.File> {
    return this.pipe.transform(file) as Promise<Express.Multer.File>;
  }
}

/** Same checks for every photo of `@UploadedFiles()` (parts of a long receipt). */
@Injectable()
export class ImageFilesPipe implements PipeTransform<Express.Multer.File[] | undefined> {
  private readonly single: ImageFilePipe;

  constructor(config: ConfigService<Env, true>) {
    this.single = new ImageFilePipe(config);
  }

  async transform(files: Express.Multer.File[] | undefined): Promise<Express.Multer.File[]> {
    const list = files ?? [];
    for (const file of list) await this.single.transform(file);
    return list;
  }
}
