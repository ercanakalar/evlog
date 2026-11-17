import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsISO4217CurrencyCode,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ReceiptKind, ReceiptStatus } from '../../generated/prisma/enums';
import { OcrItemDto } from './ocr-result.dto';

/** Multipart text fields sent with the receipt image. */
export class UploadReceiptDto {
  @IsEnum(ReceiptKind)
  kind: ReceiptKind;

  @IsOptional()
  @IsUUID()
  homeId?: string;
}

/** User corrections after reviewing what the reader found. */
export class UpdateReceiptDto {
  @IsOptional() @IsEnum(ReceiptKind)
  kind?: ReceiptKind;

  @IsOptional() @IsString() @MaxLength(200)
  merchantName?: string;

  @IsOptional() @IsDateString()
  issuedAt?: string;

  @IsOptional() @Type(() => Number) @Min(0) @Max(100_000_000)
  totalAmount?: number;

  @IsOptional() @IsISO4217CurrencyCode()
  currency?: string;

  /** Replaces all line items when present. */
  @IsOptional() @IsArray() @ArrayMaxSize(300)
  @ValidateNested({ each: true }) @Type(() => OcrItemDto)
  items?: OcrItemDto[];
}

export class ListReceiptsQueryDto {
  @IsOptional() @IsUUID()
  homeId?: string;

  @IsOptional() @IsEnum(ReceiptKind)
  kind?: ReceiptKind;

  @IsOptional() @IsEnum(ReceiptStatus)
  status?: ReceiptStatus;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  take: number = 30;

  /** Cursor: id of the last receipt of the previous page. */
  @IsOptional() @IsUUID()
  cursor?: string;
}
