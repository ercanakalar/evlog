import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsStrongPassword,
  MaxLength,
} from 'class-validator';

const trimLower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** At least 8 characters with upper case, lower case and a digit. */
const IsPassword = () =>
  applyDecorators(
    IsStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 0,
    }),
    MaxLength(128),
  );

export class RegisterDto {
  @Transform(trimLower)
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsPassword()
  password: string;

  /** Defaults to the part of the email before the "@". */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName?: string;
}

export class LoginDto {
  @Transform(trimLower)
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;
}

export class ForgotPasswordDto {
  @Transform(trimLower)
  @IsEmail()
  @MaxLength(254)
  email: string;

  /** Language of the email. */
  @IsOptional()
  @IsIn(['en', 'tr'])
  lang?: 'en' | 'tr';
}

export class ResetPasswordDto {
  @Transform(trimLower)
  @IsEmail()
  @MaxLength(254)
  email: string;

  /** The 8 digits from the email; spaces do not matter. */
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/\s/g, '') : value,
  )
  @IsString()
  @MaxLength(20)
  code: string;

  @IsPassword()
  password: string;
}

export class GoogleSignInDto {
  /** ID token from Google Sign-In on the phone. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  idToken: string;
}

export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  refreshToken: string;
}

export class TokenPairDto {
  @ApiProperty() accessToken: string;
  @ApiProperty() refreshToken: string;
  @ApiProperty({ description: 'Access token lifetime in seconds' })
  expiresIn: number;
}
