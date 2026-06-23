import { IsIn, IsOptional } from 'class-validator';
import type { AbcCycleStatus } from '../abc-scores.types';

export class ListCyclesQueryDto {
  @IsOptional()
  @IsIn(['draft', 'published'], { message: 'INVALID_CYCLE_STATUS' })
  status?: AbcCycleStatus;
}
