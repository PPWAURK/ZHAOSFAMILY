import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { CASE_SHARE_REVIEW_STATUSES } from '../case-shares.types';

export class ReviewCaseShareDto {
  @IsIn(CASE_SHARE_REVIEW_STATUSES, {
    message: 'CASE_SHARE_REVIEW_STATUS_INVALID',
  })
  status!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'CASE_SHARE_REVIEW_NOTE_TOO_LONG' })
  reviewNote?: string;
}
