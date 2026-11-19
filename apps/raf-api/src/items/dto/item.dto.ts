import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Category } from '../../generated/prisma/enums';

export class ListItemsQueryDto {
  @IsOptional() @IsEnum(Category)
  category?: Category;

  /** Only products that expire (the countdown). */
  @IsOptional() @Transform(({ value }) => value === true || value === 'true') @IsBoolean()
  expiring?: boolean;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500)
  take: number = 200;
}

export class UpdateItemDto {
  /** Opened products count down from the opening date. */
  @IsOptional() @IsBoolean()
  opened?: boolean;

  /** The date printed on the pack; null goes back to the estimate. */
  @IsOptional() @ValidateIf((_o, v) => v !== null) @IsDateString()
  packExpiresAt?: string | null;

  @IsOptional() @IsBoolean()
  usedUp?: boolean;

  /**
   * Name for the market list made when a used-up product runs out at home and
   * the user has no list yet (in the app's language).
   */
  @IsOptional() @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString() @IsNotEmpty() @MaxLength(60)
  newListName?: string;

  @IsOptional() @IsEnum(Category)
  category?: Category;
}
