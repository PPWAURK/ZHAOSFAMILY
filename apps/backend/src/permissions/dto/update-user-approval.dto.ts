import { IsIn, IsInt, IsOptional, Matches, Min } from 'class-validator';
import { Type } from 'class-transformer';
import type { AccountStatus } from '../../auth/account-status';
import { JOB_ROLE_PATTERN } from '../../auth/job-roles';

export class UpdateUserApprovalDto {
  @IsIn(['approved', 'rejected'], { message: 'INVALID_ACCOUNT_STATUS' })
  accountStatus!: Extract<AccountStatus, 'approved' | 'rejected'>;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'RESTAURANT_REQUIRED' })
  @Min(1, { message: 'RESTAURANT_REQUIRED' })
  restaurantId?: number;

  @IsOptional()
  @Matches(JOB_ROLE_PATTERN, { message: 'INVALID_JOB_ROLE' })
  jobRole?: string;
}
