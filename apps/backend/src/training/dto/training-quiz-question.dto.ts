import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  TRAINING_QUIZ_QUESTION_TYPES,
  type TrainingQuizTranslations,
} from '../training.types';

export class QuizOptionDto {
  @IsString({ message: 'INVALID_QUIZ_OPTION_KEY' })
  @MaxLength(20, { message: 'INVALID_QUIZ_OPTION_KEY' })
  key!: string;

  @IsString({ message: 'INVALID_QUIZ_OPTION_LABEL' })
  @MaxLength(300, { message: 'INVALID_QUIZ_OPTION_LABEL' })
  label!: string;
}

export class CreateTrainingQuizQuestionDto {
  @IsIn(TRAINING_QUIZ_QUESTION_TYPES, { message: 'INVALID_QUIZ_QUESTION_TYPE' })
  type!: (typeof TRAINING_QUIZ_QUESTION_TYPES)[number];

  @IsString({ message: 'INVALID_QUIZ_PROMPT' })
  @MaxLength(500, { message: 'INVALID_QUIZ_PROMPT' })
  prompt!: string;

  @IsArray({ message: 'INVALID_QUIZ_OPTIONS' })
  @ArrayMinSize(2, { message: 'INVALID_QUIZ_OPTIONS' })
  @ValidateNested({ each: true })
  @Type(() => QuizOptionDto)
  options!: QuizOptionDto[];

  @IsArray({ message: 'INVALID_QUIZ_CORRECT_KEYS' })
  @ArrayMinSize(1, { message: 'INVALID_QUIZ_CORRECT_KEYS' })
  @IsString({ each: true, message: 'INVALID_QUIZ_CORRECT_KEYS' })
  correctKeys!: string[];

  @IsOptional()
  @IsString({ message: 'INVALID_QUIZ_EXPLANATION' })
  @MaxLength(500, { message: 'INVALID_QUIZ_EXPLANATION' })
  explanation?: string | null;

  // Per-language renderings (zh/fr/bn); validated/sanitized in the service.
  @IsOptional()
  @IsObject({ message: 'INVALID_QUIZ_TRANSLATIONS' })
  translations?: TrainingQuizTranslations | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'INVALID_QUIZ_SORT_ORDER' })
  @Min(0, { message: 'INVALID_QUIZ_SORT_ORDER' })
  sortOrder?: number;
}

export class UpdateTrainingQuizQuestionDto {
  @IsOptional()
  @IsIn(TRAINING_QUIZ_QUESTION_TYPES, { message: 'INVALID_QUIZ_QUESTION_TYPE' })
  type?: (typeof TRAINING_QUIZ_QUESTION_TYPES)[number];

  @IsOptional()
  @IsString({ message: 'INVALID_QUIZ_PROMPT' })
  @MaxLength(500, { message: 'INVALID_QUIZ_PROMPT' })
  prompt?: string;

  @IsOptional()
  @IsArray({ message: 'INVALID_QUIZ_OPTIONS' })
  @ArrayMinSize(2, { message: 'INVALID_QUIZ_OPTIONS' })
  @ValidateNested({ each: true })
  @Type(() => QuizOptionDto)
  options?: QuizOptionDto[];

  @IsOptional()
  @IsArray({ message: 'INVALID_QUIZ_CORRECT_KEYS' })
  @ArrayMinSize(1, { message: 'INVALID_QUIZ_CORRECT_KEYS' })
  @IsString({ each: true, message: 'INVALID_QUIZ_CORRECT_KEYS' })
  correctKeys?: string[];

  @IsOptional()
  @IsString({ message: 'INVALID_QUIZ_EXPLANATION' })
  @MaxLength(500, { message: 'INVALID_QUIZ_EXPLANATION' })
  explanation?: string | null;

  @IsOptional()
  @IsObject({ message: 'INVALID_QUIZ_TRANSLATIONS' })
  translations?: TrainingQuizTranslations | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'INVALID_QUIZ_SORT_ORDER' })
  @Min(0, { message: 'INVALID_QUIZ_SORT_ORDER' })
  sortOrder?: number;
}
