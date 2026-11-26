import { IsBoolean, IsIn, IsInt, IsISO4217CurrencyCode, IsOptional, Max, Min } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional() @IsISO4217CurrencyCode()
  currency?: string;

  @IsOptional() @IsBoolean()
  expiryReminders?: boolean;

  @IsOptional() @IsInt() @Min(1) @Max(3) @IsIn([1, 2, 3])
  reminderLeadDays?: number;

  @IsOptional() @IsBoolean()
  trackHomeItems?: boolean;

  @IsOptional() @IsBoolean()
  countFromReceipts?: boolean;
}
