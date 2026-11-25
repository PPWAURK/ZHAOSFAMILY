import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateExamCategoryDto {
  @IsOptional()
  @IsString({ message: 'EXAM_CATEGORY_NAME_REQUIRED' })
  @MaxLength(100, { message: 'EXAM_CATEGORY_NAME_TOO_LONG' })
  nameZh?: string;

  @IsOptional()
  @IsString({ message: 'EXAM_CATEGORY_NAME_REQUIRED' })
  @MaxLength(100, { message: 'EXAM_CATEGORY_NAME_TOO_LONG' })
  nameFr?: string;

  @IsOptional()
  @IsInt({ message: 'EXAM_CATEGORY_SORT_INVALID' })
  @Min(0, { message: 'EXAM_CATEGORY_SORT_INVALID' })
  sortOrder?: number;

  @IsOptional()
  @IsBoolean({ message: 'EXAM_CATEGORY_ACTIVE_INVALID' })
  isActive?: boolean;
}

export class CreateExamCategoryDto extends UpdateExamCategoryDto {
  @IsString({ message: 'EXAM_CATEGORY_CODE_INVALID' })
  @Matches(/^[a-z0-9_-]{1,40}$/, { message: 'EXAM_CATEGORY_CODE_INVALID' })
  code!: string;
}
