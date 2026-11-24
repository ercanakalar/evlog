import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { RatingCategory } from '../../generated/prisma/enums';

export class CategoryScoreDto {
  @IsEnum(RatingCategory)
  category: RatingCategory;

  /** 1 to 5 stars. */
  @IsInt()
  @Min(1)
  @Max(5)
  score: number;
}

export class SubmitRatingDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ArrayUnique((s: CategoryScoreDto) => s.category, {
    message: 'Each category can be rated once',
  })
  @ValidateNested({ each: true })
  @Type(() => CategoryScoreDto)
  scores: CategoryScoreDto[];

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(1000)
  noteForNextTenant?: string;
}
