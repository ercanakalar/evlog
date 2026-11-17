import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ConditionSessionType, Room } from '../../generated/prisma/enums';

export class CreateConditionSessionDto {
  @IsEnum(ConditionSessionType)
  type: ConditionSessionType;
}

/** Multipart text fields sent with each photo. */
export class UploadPhotoDto {
  @IsEnum(Room)
  room: Room;

  /** When the camera took the photo (ISO 8601). */
  @IsDateString()
  capturedAt: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
