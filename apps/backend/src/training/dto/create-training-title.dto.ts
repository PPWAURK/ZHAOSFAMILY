import { Type } from 'class-transformer';
import {
  IsInt,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export const TRAINING_TITLE_FRAME_STYLES = [
  'red',
  'gold',
  'ink',
  'jade',
  'blue',
  'purple',
] as const;

export class CreateTrainingTitleDto {
  @IsOptional()
  @IsString({ message: 'INVALID_TRAINING_TITLE_CODE' })
  @MaxLength(40, { message: 'TRAINING_TITLE_CODE_TOO_LONG' })
  code?: string;

  @IsString({ message: 'INVALID_TRAINING_TITLE_NAME_ZH' })
  @IsNotEmpty({ message: 'INVALID_TRAINING_TITLE_NAME_ZH' })
  @MaxLength(100, { message: 'TRAINING_TITLE_NAME_TOO_LONG' })
  nameZh!: string;

  @IsString({ message: 'INVALID_TRAINING_TITLE_NAME_EN' })
  @IsNotEmpty({ message: 'INVALID_TRAINING_TITLE_NAME_EN' })
  @MaxLength(100, { message: 'TRAINING_TITLE_NAME_TOO_LONG' })
  nameEn!: string;

  @IsString({ message: 'INVALID_TRAINING_TITLE_NAME_FR' })
  @IsNotEmpty({ message: 'INVALID_TRAINING_TITLE_NAME_FR' })
  @MaxLength(100, { message: 'TRAINING_TITLE_NAME_TOO_LONG' })
  nameFr!: string;

  @IsString({ message: 'INVALID_TRAINING_TITLE_FRAME_STYLE' })
  @IsNotEmpty({ message: 'INVALID_TRAINING_TITLE_FRAME_STYLE' })
  @IsIn(TRAINING_TITLE_FRAME_STYLES, {
    message: 'INVALID_TRAINING_TITLE_FRAME_STYLE',
  })
  @MaxLength(40, { message: 'TRAINING_TITLE_FRAME_STYLE_TOO_LONG' })
  frameStyle!: string;

  @IsString({ message: 'INVALID_TRAINING_TITLE_POSITION' })
  @IsNotEmpty({ message: 'INVALID_TRAINING_TITLE_POSITION' })
  @MaxLength(40, { message: 'TRAINING_TITLE_POSITION_TOO_LONG' })
  unlockPositionCode!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'INVALID_TRAINING_TITLE_SORT_ORDER' })
  @Min(0, { message: 'INVALID_TRAINING_TITLE_SORT_ORDER' })
  sortOrder?: number;
}
