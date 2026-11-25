import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../dto/pagination-query.dto';
import {
  QUESTION_DIFFICULTIES,
  QUESTION_STATUSES,
  QUESTION_TYPES,
  type QuestionDifficulty,
  type QuestionStatus,
  type QuestionType,
} from '../../exam-bank.constants';

export class ListQuestionsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(QUESTION_STATUSES, { message: 'EXAM_QUESTION_STATUS_INVALID' })
  status?: QuestionStatus;

  @IsOptional()
  @IsIn(QUESTION_TYPES, { message: 'EXAM_QUESTION_TYPE_INVALID' })
  type?: QuestionType;

  @IsOptional()
  @IsIn(QUESTION_DIFFICULTIES, { message: 'EXAM_QUESTION_DIFFICULTY_INVALID' })
  difficulty?: QuestionDifficulty;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'EXAM_CATEGORY_INVALID' })
  categoryId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'KB_MATERIAL_INVALID' })
  materialId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'EXAM_GENERATION_JOB_INVALID' })
  jobId?: number;

  @IsOptional()
  @IsString({ message: 'EXAM_SEARCH_INVALID' })
  @MaxLength(100, { message: 'EXAM_SEARCH_INVALID' })
  q?: string;
}
