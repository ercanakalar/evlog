import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { HomeUnit } from '../../generated/prisma/enums';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateHomeItemDto {
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(120)
  name: string;

  /** PIECE (default) or KG. */
  @IsOptional() @IsEnum(HomeUnit)
  unit?: HomeUnit;

  /** Pieces (whole numbers), or kilograms with up to 3 decimals. */
  @IsOptional() @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) @Max(9999)
  count?: number;
}

export class UpdateHomeItemDto {
  @IsOptional() @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(120)
  name?: string;

  /** Switching unit keeps the number; a KG amount is rounded to whole pieces. */
  @IsOptional() @IsEnum(HomeUnit)
  unit?: HomeUnit;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) @Max(9999)
  count?: number;
}
