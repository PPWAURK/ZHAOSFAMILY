import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { DifficultyCountsDto } from '../../blueprint/dto/exam-blueprint.dto';

export class CreateKnowledgeMaterialDto {
  /** Defaults to the uploaded file name without its extension. */
  @IsOptional()
  @IsString({ message: 'KB_TITLE_REQUIRED' })
  @MaxLength(200, { message: 'KB_TITLE_TOO_LONG' })
  title?: string;

  @IsOptional()
  @IsString({ message: 'KB_DESCRIPTION_INVALID' })
  @MaxLength(1000, { message: 'KB_DESCRIPTION_TOO_LONG' })
  description?: string;

  /** Multipart field, hence the string → number conversion. */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'EXAM_CATEGORY_INVALID' })
  categoryId?: number;
}

export class UpdateKnowledgeMaterialDto {
  @IsOptional()
  @IsString({ message: 'KB_TITLE_REQUIRED' })
  @IsNotEmpty({ message: 'KB_TITLE_REQUIRED' })
  @MaxLength(200, { message: 'KB_TITLE_TOO_LONG' })
  title?: string;

  @IsOptional()
  @IsString({ message: 'KB_DESCRIPTION_INVALID' })
  @MaxLength(1000, { message: 'KB_DESCRIPTION_TOO_LONG' })
  description?: string | null;

  @IsOptional()
  @IsInt({ message: 'EXAM_CATEGORY_INVALID' })
  categoryId?: number | null;

  /** Bank target per difficulty (记忆 / 理解 / 情景); null clears it. */
  @IsOptional()
  @ValidateNested()
  @Type(() => DifficultyCountsDto)
  targets?: DifficultyCountsDto | null;
}
