import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  RECRUITMENT_CONTRACT_TYPES,
  RECRUITMENT_POSITIONS,
  type RecruitmentContractType,
  type RecruitmentPosition,
} from '../recruitment-requests.types';

export class CreateRecruitmentRequestDto {
  @IsIn(RECRUITMENT_CONTRACT_TYPES, { message: 'INVALID_CONTRACT_TYPE' })
  contractType!: RecruitmentContractType;

  @IsIn(RECRUITMENT_POSITIONS, { message: 'INVALID_RECRUITMENT_POSITION' })
  position!: RecruitmentPosition;

  @Type(() => Number)
  @IsInt({ message: 'INVALID_HEADCOUNT' })
  @Min(1, { message: 'INVALID_HEADCOUNT' })
  headcount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
