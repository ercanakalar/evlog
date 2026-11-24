import { PartialType, OmitType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApplianceType } from '../../generated/prisma/enums';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateTaskDto {
  /** @example "Clean filter" */
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(80)
  title: string;

  /** Repeat every N days. @example 30 */
  @IsInt() @Min(1) @Max(3650)
  intervalDays: number;

  /** When it was last done; defaults to "now" for the first due date. */
  @IsOptional() @IsDateString()
  lastDoneAt?: string;
}

export class CreateApplianceDto {
  @IsEnum(ApplianceType)
  type: ApplianceType;

  /** @example "Combi boiler" */
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(80)
  name: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(60)
  brand?: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(60)
  model?: string;

  @IsOptional() @IsDateString({ strict: true })
  purchasedAt?: string;

  @IsOptional() @IsDateString({ strict: true })
  warrantyUntil?: string;

  /** A confirmed purchase receipt. */
  @IsOptional() @IsUUID()
  receiptId?: string;

  /** Leave empty to use the recommended schedule for this appliance type. */
  @IsOptional() @IsArray() @ArrayMaxSize(10)
  @ValidateNested({ each: true }) @Type(() => CreateTaskDto)
  tasks?: CreateTaskDto[];
}

export class UpdateApplianceDto extends PartialType(
  OmitType(CreateApplianceDto, ['tasks', 'type'] as const),
) {}

export class CompleteTaskDto {
  @IsOptional() @IsDateString()
  doneAt?: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(500)
  note?: string;

  /** Service invoice, if any. */
  @IsOptional() @IsUUID()
  receiptId?: string;
}
