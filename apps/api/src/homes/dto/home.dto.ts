import { PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateHomeDto {
  /** @example "Ankara" */
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(60)
  city: string;

  /** @example "Çankaya" */
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(60)
  district: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(80)
  neighborhood?: string;

  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(250)
  addressLine: string;

  /** Room layout in Turkish notation. @example "2+1" */
  @Matches(/^\d{1,2}(\.5)?\+\d$/, { message: 'roomLayout must look like "2+1"' })
  roomLayout: string;

  /** @example 95 */
  @IsOptional() @IsInt() @Min(10) @Max(10000)
  areaM2?: number;
}

export class UpdateHomeDto extends PartialType(CreateHomeDto) {}
