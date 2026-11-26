import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ImagePartQueryDto {
  /** Which photo of a long receipt, 0 = top. */
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(5)
  part: number = 0;
}
