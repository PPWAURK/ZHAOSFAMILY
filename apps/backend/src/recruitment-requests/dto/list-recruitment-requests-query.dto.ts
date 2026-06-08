import { IsIn, IsOptional } from 'class-validator';
import {
  RECRUITMENT_REQUEST_STATUSES,
  type RecruitmentRequestStatus,
} from '../recruitment-requests.types';

export class ListRecruitmentRequestsQueryDto {
  @IsOptional()
  @IsIn(RECRUITMENT_REQUEST_STATUSES, {
    message: 'INVALID_RECRUITMENT_REQUEST_STATUS',
  })
  status?: RecruitmentRequestStatus;
}
