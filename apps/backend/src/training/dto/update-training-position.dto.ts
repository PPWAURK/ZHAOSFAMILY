import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
} from 'class-validator';

export class UpdateTrainingPositionDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  nameZh?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  nameEn?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  nameFr?: string;

  @IsOptional()
  @IsString({ message: 'INVALID_TRAINING_POSITION_PARENT' })
  @Length(2, 40, { message: 'INVALID_TRAINING_POSITION_PARENT' })
  @Matches(/^[A-Z0-9_]+$/, { message: 'INVALID_TRAINING_POSITION_PARENT' })
  parentCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
