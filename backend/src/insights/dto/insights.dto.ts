import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

export class ClockQueryDto {
  /** The phone's offset from UTC in minutes (Istanbul = 180), so months match the user's calendar. */
  @IsOptional() @Type(() => Number) @IsInt() @Min(-720) @Max(840)
  utcOffset: number = 0;
}

export class SpendingQueryDto extends ClockQueryDto {
  /** Month to break down, "YYYY-MM"; defaults to the current month. */
  @IsOptional() @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  month?: string;

  /** How many months the bar chart shows, ending with the current month. */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(24)
  months: number = 6;
}
