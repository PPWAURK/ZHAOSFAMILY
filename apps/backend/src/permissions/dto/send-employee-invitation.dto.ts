import { IsEmail, IsIn, Matches } from 'class-validator';
import { JOB_ROLE_ASSIGNMENT_PATTERN } from '../../auth/job-roles';

export class SendEmployeeInvitationDto {
  @IsEmail({}, { message: 'INVALID_INVITATION_EMAIL' })
  email!: string;

  @Matches(JOB_ROLE_ASSIGNMENT_PATTERN, { message: 'INVALID_JOB_ROLE' })
  jobRole!: string;

  @IsIn(['zh', 'en', 'fr'], { message: 'INVALID_LANGUAGE' })
  language!: 'zh' | 'en' | 'fr';
}
