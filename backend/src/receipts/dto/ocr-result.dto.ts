import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsISO4217CurrencyCode,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * Contract for the receipt reader (YOLO + OCR service). The reader returns
 * this body either directly (HTTP 200) or later to the callback URL.
 * Everything coming from the reader is validated like user input.
 */
export class OcrItemDto {
  @IsString() @IsNotEmpty() @MaxLength(200)
  name: string;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 3 }) @IsPositive() @Max(100000)
  quantity?: number;

  /** "kg", "L", "pcs"… */
  @IsOptional() @IsString() @MaxLength(16)
  unit?: string;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(10_000_000)
  unitPrice?: number;

  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(10_000_000)
  totalPrice: number;

  /** EAN-13 / EAN-8 printed beside the line (check digit verified by the reader). */
  @IsOptional() @Matches(/^(\d{8}|\d{13})$/)
  barcode?: string;
}

/** What the reader found on a photo of a product pack. */
export class LabelResultDto {
  /** The use-by / best-before date, "YYYY-MM-DD". */
  @IsOptional() @IsDateString()
  expiresOn?: string | null;

  @IsOptional() @Matches(/^(\d{8}|\d{13})$/)
  barcode?: string | null;

  @IsOptional() @IsString() @MaxLength(500)
  error?: string;

  /** The text the reader found, shown when no date was read. */
  @IsOptional() @IsString() @MaxLength(1000)
  text?: string;
}

export class OcrResultDto {
  @IsOptional() @IsString() @MaxLength(200)
  merchantName?: string;

  /** Date/time printed on the receipt, ISO 8601. */
  @IsOptional() @IsDateString()
  issuedAt?: string;

  /** "FİŞ NO" as printed, without leading zeros. */
  @IsOptional() @IsString() @MaxLength(20)
  receiptNo?: string;

  @IsOptional() @IsISO4217CurrencyCode()
  currency?: string;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100_000_000)
  total?: number;

  @IsArray() @ArrayMaxSize(300) @ValidateNested({ each: true }) @Type(() => OcrItemDto)
  items: OcrItemDto[] = [];

  /** Reader confidence between 0 and 1. */
  @IsOptional() @IsNumber() @Min(0) @Max(1)
  confidence?: number;

  /** Set instead of the fields when the reader could not read the image. */
  @IsOptional() @IsString() @MaxLength(500)
  error?: string;

  /** The text the reader found, shown when no date was read. */
  @IsOptional() @IsString() @MaxLength(1000)
  text?: string;
}
