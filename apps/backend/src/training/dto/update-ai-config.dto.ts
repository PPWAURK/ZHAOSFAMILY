import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateAiConfigDto {
  // Empty string clears the stored key; omit to leave it unchanged.
  @IsOptional()
  @IsString({ message: 'INVALID_AI_API_KEY' })
  @MaxLength(300, { message: 'INVALID_AI_API_KEY' })
  apiKey?: string;

  @IsOptional()
  @IsString({ message: 'INVALID_AI_BASE_URL' })
  @MaxLength(300, { message: 'INVALID_AI_BASE_URL' })
  baseUrl?: string;

  @IsOptional()
  @IsString({ message: 'INVALID_AI_MODEL' })
  @MaxLength(150, { message: 'INVALID_AI_MODEL' })
  model?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'INVALID_AI_MAX_TOKENS' })
  @Min(256, { message: 'INVALID_AI_MAX_TOKENS' })
  @Max(32000, { message: 'INVALID_AI_MAX_TOKENS' })
  maxTokens?: number;
}
