import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateHomeItemDto {
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(120)
  name: string;

  @IsOptional() @IsInt() @Min(0) @Max(999)
  count?: number;
}

export class UpdateHomeItemDto {
  @IsOptional() @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(120)
  name?: string;

  @IsOptional() @IsInt() @Min(0) @Max(999)
  count?: number;
}
