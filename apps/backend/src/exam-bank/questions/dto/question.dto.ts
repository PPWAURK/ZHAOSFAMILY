import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  KNOWLEDGE_POINT_MAX_LENGTH,
  QUESTION_DIFFICULTIES,
  QUESTION_TYPES,
  type QuestionDifficulty,
  type QuestionType,
} from '../../exam-bank.constants';

export class QuestionOptionDto {
  @IsString({ message: 'EXAM_QUESTION_OPTION_KEYS' })
  @MaxLength(10, { message: 'EXAM_QUESTION_OPTION_KEYS' })
  key!: string;

  @IsString({ message: 'EXAM_QUESTION_OPTION_TEXT_REQUIRED' })
  @MaxLength(500, { message: 'EXAM_QUESTION_OPTION_TOO_LONG' })
  zh!: string;

  @IsString({ message: 'EXAM_QUESTION_OPTION_TEXT_REQUIRED' })
  @MaxLength(500, { message: 'EXAM_QUESTION_OPTION_TOO_LONG' })
  fr!: string;
}

export class UpdateExamQuestionDto {
  @IsOptional()
  @IsIn(QUESTION_TYPES, { message: 'EXAM_QUESTION_TYPE_INVALID' })
  type?: QuestionType;

  @IsOptional()
  @IsIn(QUESTION_DIFFICULTIES, { message: 'EXAM_QUESTION_DIFFICULTY_INVALID' })
  difficulty?: QuestionDifficulty;

  @IsOptional()
  @IsInt({ message: 'EXAM_CATEGORY_INVALID' })
  categoryId?: number | null;

  @IsOptional()
  @IsString({ message: 'EXAM_QUESTION_PROMPT_REQUIRED' })
  @MaxLength(1000, { message: 'EXAM_QUESTION_PROMPT_TOO_LONG' })
  promptZh?: string;

  @IsOptional()
  @IsString({ message: 'EXAM_QUESTION_PROMPT_REQUIRED' })
  @MaxLength(1000, { message: 'EXAM_QUESTION_PROMPT_TOO_LONG' })
  promptFr?: string;

  @IsOptional()
  @IsArray({ message: 'EXAM_QUESTION_OPTION_COUNT' })
  @ArrayMinSize(2, { message: 'EXAM_QUESTION_OPTION_COUNT' })
  @ArrayMaxSize(5, { message: 'EXAM_QUESTION_OPTION_COUNT' })
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options?: QuestionOptionDto[];

  @IsOptional()
  @IsArray({ message: 'EXAM_QUESTION_CORRECT_KEYS_INVALID' })
  @IsString({ each: true, message: 'EXAM_QUESTION_CORRECT_KEYS_INVALID' })
  correctKeys?: string[];

  @IsOptional()
  @IsString({ message: 'EXAM_QUESTION_EXPLANATION_INVALID' })
  @MaxLength(3000, { message: 'EXAM_QUESTION_EXPLANATION_INVALID' })
  explanationZh?: string | null;

  @IsOptional()
  @IsString({ message: 'EXAM_QUESTION_EXPLANATION_INVALID' })
  @MaxLength(3000, { message: 'EXAM_QUESTION_EXPLANATION_INVALID' })
  explanationFr?: string | null;

  @IsOptional()
  @IsString({ message: 'EXAM_QUESTION_KNOWLEDGE_POINT_INVALID' })
  @MaxLength(KNOWLEDGE_POINT_MAX_LENGTH, {
    message: 'EXAM_QUESTION_KNOWLEDGE_POINT_INVALID',
  })
  knowledgePoint?: string | null;
}

/**
 * Same fields as the update DTO. Completeness (type, both prompts, options,
 * correct keys) is enforced by validateQuestion() in the service, which also
 * checks the per-type option/answer rules a decorator cannot express.
 */
export class CreateExamQuestionDto extends UpdateExamQuestionDto {}
