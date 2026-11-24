import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../../generated/prisma/client';

/** Maps well-known Prisma errors to HTTP responses instead of 500s. */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(error: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const map: Record<string, [HttpStatus, string]> = {
      P2002: [HttpStatus.CONFLICT, 'A record with these values already exists'],
      P2003: [HttpStatus.CONFLICT, 'The record is referenced by other data'],
      P2025: [HttpStatus.NOT_FOUND, 'Record not found'],
    };
    const mapped = map[error.code];
    if (!mapped) {
      this.logger.error(`${error.code}: ${error.message}`);
      response
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ statusCode: 500, message: 'Internal server error' });
      return;
    }
    const [statusCode, message] = mapped;
    response.status(statusCode).json({ statusCode, message, code: error.code });
  }
}
