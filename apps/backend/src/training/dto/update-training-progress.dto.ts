import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateTrainingProgressDto {
  @IsOptional()
  @IsIn(['in_progress', 'completed'], {
    message: 'INVALID_TRAINING_PROGRESS_STATUS',
  })
  status?: 'in_progress' | 'completed';

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'INVALID_TRAINING_PROGRESS_PERCENT' })
  @Min(0, { message: 'INVALID_TRAINING_PROGRESS_PERCENT' })
  @Max(100, { message: 'INVALID_TRAINING_PROGRESS_PERCENT' })
  progressPct?: number;
}
