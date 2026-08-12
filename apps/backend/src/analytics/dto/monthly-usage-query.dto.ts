import { IsOptional, Matches } from 'class-validator';

export class MonthlyUsageQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'MONTH_INVALID' })
  month?: string;
}
