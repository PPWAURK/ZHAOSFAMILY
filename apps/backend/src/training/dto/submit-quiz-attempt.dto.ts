import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  ValidateNested,
} from 'class-validator';

export class QuizAnswerDto {
  @Type(() => Number)
  @IsInt({ message: 'INVALID_QUIZ_QUESTION_ID' })
  questionId!: number;

  @IsArray({ message: 'INVALID_QUIZ_ANSWER' })
  @IsString({ each: true, message: 'INVALID_QUIZ_ANSWER' })
  selectedKeys!: string[];
}

export class SubmitQuizAttemptDto {
  @IsArray({ message: 'INVALID_QUIZ_ANSWERS' })
  @ArrayMinSize(1, { message: 'INVALID_QUIZ_ANSWERS' })
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers!: QuizAnswerDto[];
}
