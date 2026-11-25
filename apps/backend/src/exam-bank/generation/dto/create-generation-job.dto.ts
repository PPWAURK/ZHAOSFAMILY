import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  GENERATION_MODES,
  type GenerationMode,
} from '../../exam-bank.constants';

export class TypeMixDto {
  @IsNumber({}, { message: 'EXAM_TYPE_MIX_INVALID' })
  @Min(0, { message: 'EXAM_TYPE_MIX_INVALID' })
  single!: number;

  @IsNumber({}, { message: 'EXAM_TYPE_MIX_INVALID' })
  @Min(0, { message: 'EXAM_TYPE_MIX_INVALID' })
  multiple!: number;

  @IsNumber({}, { message: 'EXAM_TYPE_MIX_INVALID' })
  @Min(0, { message: 'EXAM_TYPE_MIX_INVALID' })
  boolean!: number;
}

export class CreateGenerationJobDto {
  /** COUNT (default): `count` questions over the materials · TARGET: fill their targets. */
  @IsOptional()
  @IsIn(GENERATION_MODES, { message: 'EXAM_GENERATION_MODE_INVALID' })
  mode?: GenerationMode;

  @IsArray({ message: 'EXAM_MATERIALS_REQUIRED' })
  @ArrayMinSize(1, { message: 'EXAM_MATERIALS_REQUIRED' })
  @ArrayMaxSize(100, { message: 'EXAM_TOO_MANY_MATERIALS' })
  @IsInt({ each: true, message: 'EXAM_MATERIALS_REQUIRED' })
  materialIds!: number[];

  @ValidateIf((dto: CreateGenerationJobDto) => dto.mode !== 'TARGET')
  @IsInt({ message: 'EXAM_GENERATION_COUNT_INVALID' })
  @Min(1, { message: 'EXAM_GENERATION_COUNT_INVALID' })
  @Max(10_000, { message: 'EXAM_GENERATION_COUNT_INVALID' })
  count?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => TypeMixDto)
  typeMix?: TypeMixDto;
}
