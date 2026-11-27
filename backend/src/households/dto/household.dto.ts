import { IsString, MaxLength } from 'class-validator';

export class JoinHouseholdDto {
  /** The invite code a member of the household shows, e.g. "K7PM-4QXR". */
  @IsString()
  @MaxLength(20)
  code!: string;
}
