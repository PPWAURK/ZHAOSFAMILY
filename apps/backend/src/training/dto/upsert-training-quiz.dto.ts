import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpsertTrainingQuizDto {
  @Type(() => Number)
  @IsInt({ message: 'INVALID_QUIZ_PASSING_SCORE' })
  @Min(1, { message: 'INVALID_QUIZ_PASSING_SCORE' })
  @Max(100, { message: 'INVALID_QUIZ_PASSING_SCORE' })
  passingScore!: number;

  // 0 means "use the whole question bank each attempt".
  @Type(() => Number)
  @IsInt({ message: 'INVALID_QUIZ_QUESTION_COUNT' })
  @Min(0, { message: 'INVALID_QUIZ_QUESTION_COUNT' })
  @Max(100, { message: 'INVALID_QUIZ_QUESTION_COUNT' })
  questionCount!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'INVALID_QUIZ_MAX_ATTEMPTS' })
  @Min(1, { message: 'INVALID_QUIZ_MAX_ATTEMPTS' })
  @Max(50, { message: 'INVALID_QUIZ_MAX_ATTEMPTS' })
  maxAttempts?: number | null;
}
