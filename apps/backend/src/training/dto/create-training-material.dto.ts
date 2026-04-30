import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { TRAINING_MATERIAL_TYPES } from '../training.types';

export class CreateTrainingMaterialDto {
  @IsString({ message: 'INVALID_TRAINING_POSITION' })
  @Length(1, 40, { message: 'INVALID_TRAINING_POSITION' })
  @Matches(/^[A-Z0-9_]+$/, { message: 'INVALID_TRAINING_POSITION' })
  positionId!: string;

  @IsIn(TRAINING_MATERIAL_TYPES, { message: 'INVALID_TRAINING_MATERIAL_TYPE' })
  type!: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'INVALID_TRAINING_REQUIRED_FLAG' })
  isRequired?: boolean;

  @IsString({ message: 'TRAINING_MATERIAL_TITLE_REQUIRED' })
  @Length(1, 255, { message: 'TRAINING_MATERIAL_TITLE_INVALID_LENGTH' })
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsString({ message: 'TRAINING_MATERIAL_ORIGINAL_NAME_REQUIRED' })
  @Length(1, 255)
  originalName!: string;

  @IsString({ message: 'TRAINING_MATERIAL_MIME_TYPE_REQUIRED' })
  @Length(1, 100)
  mimeType!: string;

  @Type(() => Number)
  @Min(0, { message: 'INVALID_TRAINING_MATERIAL_SIZE' })
  sizeBytes!: number;

  @IsString({ message: 'TRAINING_MATERIAL_BUCKET_REQUIRED' })
  @Length(1, 100)
  bucket!: string;

  @IsString({ message: 'TRAINING_MATERIAL_OBJECT_KEY_REQUIRED' })
  @Length(1, 500)
  objectKey!: string;
}
