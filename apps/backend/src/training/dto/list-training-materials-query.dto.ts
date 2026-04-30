import {
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { TRAINING_MATERIAL_TYPES } from '../training.types';

export class ListTrainingMaterialsQueryDto {
  @IsOptional()
  @IsString({ message: 'INVALID_TRAINING_POSITION' })
  @Length(1, 40, { message: 'INVALID_TRAINING_POSITION' })
  @Matches(/^[A-Z0-9_]+$/, { message: 'INVALID_TRAINING_POSITION' })
  positionId?: string;

  @IsOptional()
  @IsIn(TRAINING_MATERIAL_TYPES, { message: 'INVALID_TRAINING_MATERIAL_TYPE' })
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
