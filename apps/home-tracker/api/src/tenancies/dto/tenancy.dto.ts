import { IsDateString, IsOptional, IsString, Length } from 'class-validator';

export class InviteTenantDto {
  /** First day of the tenancy. @example "2026-09-01" */
  @IsDateString({ strict: true })
  startDate: string;
}

export class AcceptInviteDto {
  @IsString()
  @Length(10, 10)
  code: string;
}

export class EndTenancyDto {
  @IsOptional()
  @IsDateString({ strict: true })
  endDate?: string;
}
