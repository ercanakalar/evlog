import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class UpdatePantryItemDto {
  @IsOptional() @IsBoolean()
  trackLow?: boolean;

  /** Override the learned "usually lasts" value. */
  @IsOptional() @IsInt() @Min(1) @Max(365)
  usualDurationDays?: number;
}

export class CreateShoppingItemDto {
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(120)
  name: string;
}

export class UpdateShoppingItemDto {
  @IsBoolean()
  done: boolean;
}

export class MarketPriceQueryDto {
  /** Product name to look up, e.g. "süt". */
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(80)
  q: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(60)
  city?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(365)
  days: number = 30;
}
