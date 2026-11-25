import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  MAX_BLUEPRINT_ITEMS,
  MAX_BLUEPRINT_SECTIONS,
  MAX_BREAK_MINUTES,
} from '../../exam-bank.constants';

const MAX_PER_ITEM = 200;

export class DifficultyCountsDto {
  @IsInt({ message: 'EXAM_BLUEPRINT_DIFFICULTY_MISMATCH' })
  @Min(0, { message: 'EXAM_BLUEPRINT_DIFFICULTY_MISMATCH' })
  @Max(MAX_PER_ITEM, { message: 'EXAM_BLUEPRINT_DIFFICULTY_MISMATCH' })
  recall!: number;

  @IsInt({ message: 'EXAM_BLUEPRINT_DIFFICULTY_MISMATCH' })
  @Min(0, { message: 'EXAM_BLUEPRINT_DIFFICULTY_MISMATCH' })
  @Max(MAX_PER_ITEM, { message: 'EXAM_BLUEPRINT_DIFFICULTY_MISMATCH' })
  understand!: number;

  @IsInt({ message: 'EXAM_BLUEPRINT_DIFFICULTY_MISMATCH' })
  @Min(0, { message: 'EXAM_BLUEPRINT_DIFFICULTY_MISMATCH' })
  @Max(MAX_PER_ITEM, { message: 'EXAM_BLUEPRINT_DIFFICULTY_MISMATCH' })
  scenario!: number;
}

export class TypeCountsDto {
  @IsInt({ message: 'EXAM_BLUEPRINT_TYPE_MISMATCH' })
  @Min(0, { message: 'EXAM_BLUEPRINT_TYPE_MISMATCH' })
  @Max(MAX_PER_ITEM, { message: 'EXAM_BLUEPRINT_TYPE_MISMATCH' })
  single!: number;

  @IsInt({ message: 'EXAM_BLUEPRINT_TYPE_MISMATCH' })
  @Min(0, { message: 'EXAM_BLUEPRINT_TYPE_MISMATCH' })
  @Max(MAX_PER_ITEM, { message: 'EXAM_BLUEPRINT_TYPE_MISMATCH' })
  multiple!: number;

  @IsInt({ message: 'EXAM_BLUEPRINT_TYPE_MISMATCH' })
  @Min(0, { message: 'EXAM_BLUEPRINT_TYPE_MISMATCH' })
  @Max(MAX_PER_ITEM, { message: 'EXAM_BLUEPRINT_TYPE_MISMATCH' })
  boolean!: number;
}

export class BlueprintItemDto {
  @IsInt({ message: 'EXAM_BLUEPRINT_MATERIAL_INVALID' })
  materialId!: number;

  @IsInt({ message: 'EXAM_BLUEPRINT_ITEM_COUNT_INVALID' })
  @Min(1, { message: 'EXAM_BLUEPRINT_ITEM_COUNT_INVALID' })
  @Max(MAX_PER_ITEM, { message: 'EXAM_BLUEPRINT_ITEM_COUNT_INVALID' })
  count!: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => DifficultyCountsDto)
  difficulty?: DifficultyCountsDto | null;
}

export class BlueprintSectionDto {
  @IsString({ message: 'EXAM_BLUEPRINT_SECTION_TITLE_REQUIRED' })
  @MaxLength(100, { message: 'EXAM_BLUEPRINT_SECTION_TITLE_REQUIRED' })
  titleZh!: string;

  @IsString({ message: 'EXAM_BLUEPRINT_SECTION_TITLE_REQUIRED' })
  @MaxLength(100, { message: 'EXAM_BLUEPRINT_SECTION_TITLE_REQUIRED' })
  titleFr!: string;

  @IsOptional()
  @IsInt({ message: 'EXAM_TEMPLATE_TIME_LIMIT_INVALID' })
  @Min(1, { message: 'EXAM_TEMPLATE_TIME_LIMIT_INVALID' })
  @Max(600, { message: 'EXAM_TEMPLATE_TIME_LIMIT_INVALID' })
  timeLimitMinutes?: number | null;

  @ValidateNested()
  @Type(() => TypeCountsDto)
  typeCounts!: TypeCountsDto;

  @IsArray({ message: 'EXAM_BLUEPRINT_SECTION_EMPTY' })
  @ArrayMaxSize(MAX_BLUEPRINT_ITEMS, {
    message: 'EXAM_BLUEPRINT_TOO_MANY_ITEMS',
  })
  @ValidateNested({ each: true })
  @Type(() => BlueprintItemDto)
  items!: BlueprintItemDto[];
}

export class BlueprintRuleDto {
  @IsInt({ message: 'EXAM_BLUEPRINT_RULE_INVALID' })
  categoryId!: number;

  @IsInt({ message: 'EXAM_BLUEPRINT_RULE_INVALID' })
  @Min(0, { message: 'EXAM_BLUEPRINT_RULE_INVALID' })
  @Max(MAX_PER_ITEM, { message: 'EXAM_BLUEPRINT_RULE_INVALID' })
  maxWrong!: number;
}

export class ExamBlueprintDto {
  @IsArray({ message: 'EXAM_BLUEPRINT_SECTION_COUNT_INVALID' })
  @ArrayMaxSize(MAX_BLUEPRINT_SECTIONS, {
    message: 'EXAM_BLUEPRINT_SECTION_COUNT_INVALID',
  })
  @ValidateNested({ each: true })
  @Type(() => BlueprintSectionDto)
  sections!: BlueprintSectionDto[];

  @IsOptional()
  @IsInt({ message: 'EXAM_BLUEPRINT_BREAK_INVALID' })
  @Min(0, { message: 'EXAM_BLUEPRINT_BREAK_INVALID' })
  @Max(MAX_BREAK_MINUTES, { message: 'EXAM_BLUEPRINT_BREAK_INVALID' })
  breakMinutes?: number;

  @IsOptional()
  @IsArray({ message: 'EXAM_BLUEPRINT_RULE_INVALID' })
  @ArrayMaxSize(20, { message: 'EXAM_BLUEPRINT_RULE_INVALID' })
  @ValidateNested({ each: true })
  @Type(() => BlueprintRuleDto)
  rules?: BlueprintRuleDto[];
}
