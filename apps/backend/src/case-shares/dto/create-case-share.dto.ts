import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';
import { CASE_SHARE_TYPES } from '../case-shares.types';

export class CreateCaseShareDto {
  @IsIn(CASE_SHARE_TYPES, { message: 'CASE_SHARE_TYPE_INVALID' })
  type!: string;

  @IsString({ message: 'CASE_SHARE_CONTENT_REQUIRED' })
  @Length(1, 2000, { message: 'CASE_SHARE_CONTENT_INVALID_LENGTH' })
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  imageBucket?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageObjectKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  imageName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  imageMimeType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  imageSizeBytes?: number;
}
