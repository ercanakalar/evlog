import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LookupQueryDto {
  @IsString() @IsNotEmpty() @MaxLength(200)
  name: string;
}
