import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ABC_GRADES, type AbcGrade } from '../abc-scores.types';

export class RecordInspectionDto {
  @IsIn(ABC_GRADES, { message: 'INVALID_GRADE' })
  grade!: AbcGrade;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
