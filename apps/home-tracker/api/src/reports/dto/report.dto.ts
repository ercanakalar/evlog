import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ReportReason, ReportStatus, ReportTarget } from '../../generated/prisma/enums';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

class ReportBodyDto {
  @IsEnum(ReportReason)
  reason: ReportReason;

  /** What is wrong with it, in the reporter's words. */
  @IsOptional() @Transform(trim) @IsString() @MaxLength(1000)
  details?: string;
}

/** From a signed-in owner or tenant. */
export class CreateReportDto extends ReportBodyDto {
  @IsIn([ReportTarget.RATING, ReportTarget.CONDITION_PHOTO])
  targetType: ReportTarget;

  @IsUUID()
  targetId: string;
}

/** From a broker, about the listing behind their link or something in it. */
export class CreateSharedReportDto extends ReportBodyDto {
  @IsEnum(ReportTarget)
  targetType: ReportTarget;

  /** Not needed for the listing itself. */
  @ValidateIf((dto: CreateSharedReportDto) => dto.targetType !== ReportTarget.LISTING)
  @IsUUID()
  targetId?: string;
}

export class ListReportsQueryDto {
  @IsOptional() @IsEnum(ReportStatus)
  status: ReportStatus = ReportStatus.OPEN;

  @IsOptional() @IsUUID()
  cursor?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  take: number = 50;
}

export const RESOLUTIONS = ['DISMISS', 'HIDE', 'HIDE_NOTE', 'RESTORE'] as const;

export class ResolveReportDto {
  /**
   * DISMISS   the content is fine, change nothing
   * HIDE      hide the rating (with its scores), photo or listing
   * HIDE_NOTE hide a rating's note and keep its scores
   * RESTORE   show hidden content again
   */
  @IsIn(RESOLUTIONS)
  action: (typeof RESOLUTIONS)[number];

  /** Why; kept with the report. */
  @IsOptional() @Transform(trim) @IsString() @MaxLength(1000)
  note?: string;
}
