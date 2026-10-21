import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  RECRUITMENT_REQUEST_STATUSES,
  type RecruitmentRequestStatus,
} from '../recruitment-requests.types';

export class UpdateRecruitmentRequestDto {
  @IsOptional()
  @IsIn(RECRUITMENT_REQUEST_STATUSES, {
    message: 'INVALID_RECRUITMENT_REQUEST_STATUS',
  })
  status?: RecruitmentRequestStatus;

  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  handledNotes?: string;
}
