import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream, ReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Env } from '../config/env.validation';

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

/**
 * Write-once file storage on local disk. Keys are random and never reused, so
 * a stored file is never overwritten, only removed. Swap this class for an S3/MinIO driver
 * in production without touching callers.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly root: string;

  constructor(config: ConfigService<Env, true>) {
    this.root = resolve(config.get('UPLOAD_DIR', { infer: true }));
  }

  async save(folder: string, buffer: Buffer, mimeType: string): Promise<string> {
    const ext = EXTENSIONS[mimeType] ?? extname(mimeType) ?? '';
    const now = new Date();
    const key = [
      folder,
      String(now.getUTCFullYear()),
      String(now.getUTCMonth() + 1).padStart(2, '0'),
      `${randomUUID()}${ext}`,
    ].join('/');
    const path = this.pathFor(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, buffer, { flag: 'wx', mode: 0o640 });
    return key;
  }

  async open(key: string): Promise<ReadStream> {
    const path = this.pathFor(key);
    try {
      await stat(path);
    } catch {
      throw new NotFoundException('File not found');
    }
    return createReadStream(path);
  }

  /**
   * Deletes files whose rows are already gone. A file that cannot be deleted
   * is logged, not thrown: the caller's change has been committed.
   */
  async remove(keys: string[]): Promise<void> {
    await Promise.all(
      keys.map(async (key) => {
        try {
          await rm(this.pathFor(key), { force: true });
        } catch (error) {
          this.logger.error(`Could not delete ${key}: ${String(error)}`);
        }
      }),
    );
  }

  private pathFor(key: string): string {
    const path = resolve(join(this.root, key));
    if (!path.startsWith(this.root + sep)) {
      throw new NotFoundException('File not found');
    }
    return path;
  }
}
