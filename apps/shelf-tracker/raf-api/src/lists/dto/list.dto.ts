import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class ListNameDto {
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(60)
  name: string;
}

export class AddListItemDto {
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(120)
  name: string;
}

export class UpdateListItemDto {
  @IsOptional() @IsBoolean()
  done?: boolean;

  @IsOptional() @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(120)
  name?: string;
}
