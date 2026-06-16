import { IsDateString, IsOptional } from 'class-validator';

export class ProductStatsQueryDto {
  // Inclusive ISO date (YYYY-MM-DD or full ISO) lower bound on order createdAt.
  @IsOptional()
  @IsDateString({}, { message: 'INVALID_DATE' })
  from?: string;

  // Inclusive ISO date upper bound on order createdAt.
  @IsOptional()
  @IsDateString({}, { message: 'INVALID_DATE' })
  to?: string;
}
