import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class ProductStatsQueryDto {
  // Inclusive ISO date (YYYY-MM-DD or full ISO) lower bound on order createdAt.
  @IsOptional()
  @IsDateString({}, { message: 'INVALID_DATE' })
  from?: string;

  // Inclusive ISO date upper bound on order createdAt.
  @IsOptional()
  @IsDateString({}, { message: 'INVALID_DATE' })
  to?: string;

  // Target store — honored only for holding viewers; store users are always
  // pinned to their own restaurant regardless of this value.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  restaurantId?: number;
}
