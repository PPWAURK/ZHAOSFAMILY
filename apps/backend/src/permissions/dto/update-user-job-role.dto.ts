import { Matches } from 'class-validator';
import { JOB_ROLE_PATTERN } from '../../auth/job-roles';

export class UpdateUserJobRoleDto {
  @Matches(JOB_ROLE_PATTERN, { message: 'INVALID_JOB_ROLE' })
  jobRole!: string;
}
