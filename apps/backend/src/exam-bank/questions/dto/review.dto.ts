import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { BULK_REVIEW_LIMIT } from '../../exam-bank.constants';

export const REVIEW_ACTIONS = ['approve', 'reject', 'archive'] as const;
export type ReviewAction = (typeof REVIEW_ACTIONS)[number];

export class RejectQuestionDto {
  @IsOptional()
  @IsString({ message: 'EXAM_REJECT_REASON_INVALID' })
  @MaxLength(300, { message: 'EXAM_REJECT_REASON_INVALID' })
  reason?: string;
}

export class BulkReviewDto extends RejectQuestionDto {
  @IsArray({ message: 'EXAM_REVIEW_IDS_REQUIRED' })
  @ArrayMinSize(1, { message: 'EXAM_REVIEW_IDS_REQUIRED' })
  @ArrayMaxSize(BULK_REVIEW_LIMIT, { message: 'EXAM_REVIEW_TOO_MANY' })
  @IsInt({ each: true, message: 'EXAM_REVIEW_IDS_REQUIRED' })
  ids!: number[];

  @IsIn(REVIEW_ACTIONS, { message: 'EXAM_REVIEW_ACTION_INVALID' })
  action!: ReviewAction;
}
