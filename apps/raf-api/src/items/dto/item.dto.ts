import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, Max, Min, ValidateIf } from 'class-validator';
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

  @IsOptional() @IsEnum(Category)
  category?: Category;
}
