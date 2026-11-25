import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ExamBlueprintDto } from '../../blueprint/dto/exam-blueprint.dto';
import {
  QUESTION_DIFFICULTIES,
  TEMPLATE_ACCESS_MODES,
  type QuestionDifficulty,
  type TemplateAccessMode,
} from '../../exam-bank.constants';

const MAX_PER_TYPE = 200;

/** Pool filters + per-type counts, shared by templates and the pool check. */
export class ExamPoolConfigDto {
  @IsOptional()
  @IsInt({ message: 'EXAM_TEMPLATE_COUNT_INVALID' })
  @Min(0, { message: 'EXAM_TEMPLATE_COUNT_INVALID' })
  @Max(MAX_PER_TYPE, { message: 'EXAM_TEMPLATE_COUNT_INVALID' })
  singleCount?: number;

  @IsOptional()
  @IsInt({ message: 'EXAM_TEMPLATE_COUNT_INVALID' })
  @Min(0, { message: 'EXAM_TEMPLATE_COUNT_INVALID' })
  @Max(MAX_PER_TYPE, { message: 'EXAM_TEMPLATE_COUNT_INVALID' })
  multipleCount?: number;

  @IsOptional()
  @IsInt({ message: 'EXAM_TEMPLATE_COUNT_INVALID' })
  @Min(0, { message: 'EXAM_TEMPLATE_COUNT_INVALID' })
  @Max(MAX_PER_TYPE, { message: 'EXAM_TEMPLATE_COUNT_INVALID' })
  booleanCount?: number;

  @IsOptional()
  @IsArray({ message: 'EXAM_TEMPLATE_FILTER_INVALID' })
  @ArrayMaxSize(100, { message: 'EXAM_TEMPLATE_FILTER_INVALID' })
  @IsInt({ each: true, message: 'EXAM_TEMPLATE_FILTER_INVALID' })
  categoryIds?: number[] | null;

  @IsOptional()
  @IsArray({ message: 'EXAM_TEMPLATE_FILTER_INVALID' })
  @ArrayMaxSize(100, { message: 'EXAM_TEMPLATE_FILTER_INVALID' })
  @IsInt({ each: true, message: 'EXAM_TEMPLATE_FILTER_INVALID' })
  materialIds?: number[] | null;

  @IsOptional()
  @IsArray({ message: 'EXAM_TEMPLATE_FILTER_INVALID' })
  @IsIn(QUESTION_DIFFICULTIES, {
    each: true,
    message: 'EXAM_TEMPLATE_FILTER_INVALID',
  })
  difficulties?: QuestionDifficulty[] | null;
}

export class UpdateExamTemplateDto extends ExamPoolConfigDto {
  @IsOptional()
  @IsString({ message: 'EXAM_TEMPLATE_TITLE_REQUIRED' })
  @MaxLength(200, { message: 'EXAM_TEMPLATE_TITLE_TOO_LONG' })
  titleZh?: string;

  @IsOptional()
  @IsString({ message: 'EXAM_TEMPLATE_TITLE_REQUIRED' })
  @MaxLength(200, { message: 'EXAM_TEMPLATE_TITLE_TOO_LONG' })
  titleFr?: string;

  @IsOptional()
  @IsString({ message: 'EXAM_TEMPLATE_DESCRIPTION_INVALID' })
  @MaxLength(3000, { message: 'EXAM_TEMPLATE_DESCRIPTION_INVALID' })
  descriptionZh?: string | null;

  @IsOptional()
  @IsString({ message: 'EXAM_TEMPLATE_DESCRIPTION_INVALID' })
  @MaxLength(3000, { message: 'EXAM_TEMPLATE_DESCRIPTION_INVALID' })
  descriptionFr?: string | null;

  @IsOptional()
  @IsInt({ message: 'EXAM_TEMPLATE_TIME_LIMIT_INVALID' })
  @Min(1, { message: 'EXAM_TEMPLATE_TIME_LIMIT_INVALID' })
  @Max(600, { message: 'EXAM_TEMPLATE_TIME_LIMIT_INVALID' })
  timeLimitMinutes?: number | null;

  @IsOptional()
  @IsInt({ message: 'EXAM_TEMPLATE_PASSING_SCORE_INVALID' })
  @Min(0, { message: 'EXAM_TEMPLATE_PASSING_SCORE_INVALID' })
  @Max(100, { message: 'EXAM_TEMPLATE_PASSING_SCORE_INVALID' })
  passingScore?: number;

  @IsOptional()
  @IsInt({ message: 'EXAM_TEMPLATE_MAX_ATTEMPTS_INVALID' })
  @Min(1, { message: 'EXAM_TEMPLATE_MAX_ATTEMPTS_INVALID' })
  @Max(100, { message: 'EXAM_TEMPLATE_MAX_ATTEMPTS_INVALID' })
  maxAttempts?: number | null;

  @IsOptional()
  @IsBoolean({ message: 'EXAM_TEMPLATE_FLAG_INVALID' })
  shuffleOptions?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'EXAM_TEMPLATE_FLAG_INVALID' })
  showExplanations?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'EXAM_TEMPLATE_FLAG_INVALID' })
  isActive?: boolean;

  @IsOptional()
  @IsIn(TEMPLATE_ACCESS_MODES, { message: 'EXAM_TEMPLATE_ACCESS_MODE_INVALID' })
  accessMode?: TemplateAccessMode;

  /**
   * Sectioned paper. When present it replaces the per-type counts and pool
   * filters; send null to switch the template back to simple mode.
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => ExamBlueprintDto)
  blueprint?: ExamBlueprintDto | null;
}

/** Same fields; titles and a non-empty question count are enforced in the service. */
export class CreateExamTemplateDto extends UpdateExamTemplateDto {}
