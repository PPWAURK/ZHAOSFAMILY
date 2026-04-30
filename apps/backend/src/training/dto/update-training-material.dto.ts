import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { TRAINING_MATERIAL_TYPES } from '../training.types';

export class UpdateTrainingMaterialDto {
  @IsOptional()
  @IsString({ message: 'INVALID_TRAINING_POSITION' })
  @Length(1, 40, { message: 'INVALID_TRAINING_POSITION' })
  @Matches(/^[A-Z0-9_]+$/, { message: 'INVALID_TRAINING_POSITION' })
  positionId?: string;

  @IsOptional()
  @IsIn(TRAINING_MATERIAL_TYPES, { message: 'INVALID_TRAINING_MATERIAL_TYPE' })
  type?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'INVALID_TRAINING_REQUIRED_FLAG' })
  isRequired?: boolean;

  @IsOptional()
  @IsString({ message: 'TRAINING_MATERIAL_TITLE_REQUIRED' })
  @Length(1, 255, { message: 'TRAINING_MATERIAL_TITLE_INVALID_LENGTH' })
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
