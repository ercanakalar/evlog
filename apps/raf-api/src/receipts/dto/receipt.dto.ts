import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsISO4217CurrencyCode,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Category, ReceiptStatus } from '../../generated/prisma/enums';

/** One line as the user corrected it on the review screen. */
export class ReceiptLineDto {
  /** Clean name shown in the app. */
  @IsString() @IsNotEmpty() @MaxLength(200)
  name: string;

  /** Text printed on the receipt; defaults to the name. */
  @IsOptional() @IsString() @MaxLength(200)
  rawName?: string;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 3 }) @IsPositive() @Max(100000)
  quantity?: number;

  @IsOptional() @IsString() @MaxLength(16)
  unit?: string;

  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(10_000_000)
  totalPrice: number;

  @IsOptional() @IsEnum(Category)
  category?: Category;

  /** Overrides the reference shelf life; null = does not expire. */
  @IsOptional() @IsInt() @Min(0) @Max(3650)
  shelfLifeDays?: number | null;

  /** The user confirmed the matched product. */
  @IsOptional() @IsBoolean()
  checked?: boolean;
}

/** User corrections after reviewing what the reader found. */
export class UpdateReceiptDto {
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
  @ValidateNested({ each: true }) @Type(() => ReceiptLineDto)
  items?: ReceiptLineDto[];
}

export class ListReceiptsQueryDto {
  @IsOptional() @IsEnum(ReceiptStatus)
  status?: ReceiptStatus;

  /** Exact market name, as returned in `merchantName`. */
  @IsOptional() @IsString() @MaxLength(200)
  market?: string;

  /** Trips on or after this date. */
  @IsOptional() @IsDateString()
  from?: string;

  /** Trips before this date. */
  @IsOptional() @IsDateString()
  to?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  take: number = 30;

  /** Cursor: id of the last receipt of the previous page. */
  @IsOptional() @IsUUID()
  cursor?: string;
}
