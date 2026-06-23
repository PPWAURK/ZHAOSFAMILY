import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ABC_GRADES, type AbcGrade } from '../abc-scores.types';

// 运营部填稽核分时一并手动给出 A/B/C 评级（评级可选，独立于分数）。
export class FillOperationsScoreDto {
  @Type(() => Number)
  @IsInt({ message: 'INVALID_SCORE' })
  @Min(0, { message: 'INVALID_SCORE' })
  @Max(100, { message: 'INVALID_SCORE' })
  score!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsIn(ABC_GRADES, { message: 'INVALID_GRADE' })
  grade?: AbcGrade;
}
