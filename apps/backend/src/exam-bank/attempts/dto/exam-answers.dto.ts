import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ExamAnswerDto {
  @IsInt({ message: 'EXAM_ANSWER_QUESTION_INVALID' })
  questionId!: number;

  @IsArray({ message: 'EXAM_ANSWER_KEYS_INVALID' })
  @ArrayMaxSize(5, { message: 'EXAM_ANSWER_KEYS_INVALID' })
  @IsString({ each: true, message: 'EXAM_ANSWER_KEYS_INVALID' })
  @MaxLength(10, { each: true, message: 'EXAM_ANSWER_KEYS_INVALID' })
  selectedKeys!: string[];
}

export class ExamAnswersDto {
  @IsArray({ message: 'EXAM_ANSWERS_INVALID' })
  @ArrayMaxSize(600, { message: 'EXAM_ANSWERS_INVALID' })
  @ValidateNested({ each: true })
  @Type(() => ExamAnswerDto)
  answers!: ExamAnswerDto[];
}

/** Sectioned papers say which section they hand in, so a repeated tap is harmless. */
export class SubmitExamAnswersDto extends ExamAnswersDto {
  @IsOptional()
  @IsInt({ message: 'EXAM_SECTION_INVALID' })
  @Min(0, { message: 'EXAM_SECTION_INVALID' })
  sectionIndex?: number;
}

export class StartExamSectionDto {
  @IsInt({ message: 'EXAM_SECTION_INVALID' })
  @Min(0, { message: 'EXAM_SECTION_INVALID' })
  sectionIndex!: number;
}
