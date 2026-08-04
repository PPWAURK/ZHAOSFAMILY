import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ABC_GRADES, type AbcGrade } from '../abc-scores.types';

export class RecordInspectionDto {
  @IsOptional()
  @IsIn(ABC_GRADES, { message: 'INVALID_GRADE' })
  grade?: AbcGrade;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'INVALID_RANK' })
  @Min(1, { message: 'INVALID_RANK' })
  rank?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
