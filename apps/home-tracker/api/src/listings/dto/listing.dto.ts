import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ListingType } from '../../generated/prisma/enums';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class LinkListingDto {
  /** A sahibinden.com listing link or its numeric id. */
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(500)
  reference: string;

  @IsOptional() @IsEnum(ListingType)
  type?: ListingType;
}

export class UpdateListingDto {
  @IsOptional() @IsBoolean()
  sharePhotos?: boolean;

  @IsOptional() @IsBoolean()
  shareRatings?: boolean;

  @IsOptional() @IsBoolean()
  shareHeatingBills?: boolean;

  /** A photo from this home's condition records. */
  @IsOptional() @IsUUID()
  coverPhotoId?: string;
}

export class AddBrokerDto {
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(120)
  agencyName: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(120)
  contactName?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email: string;
}
