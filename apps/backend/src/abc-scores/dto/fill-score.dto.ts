import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// 营销分与稽核分使用同一形态：0-100 的整数 + 可选备注。
export class FillScoreDto {
  @Type(() => Number)
  @IsInt({ message: 'INVALID_SCORE' })
  @Min(0, { message: 'INVALID_SCORE' })
  @Max(100, { message: 'INVALID_SCORE' })
  score!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
