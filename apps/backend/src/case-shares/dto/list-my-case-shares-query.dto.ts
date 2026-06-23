import { IsIn, IsOptional } from 'class-validator';
import { CASE_SHARE_STATUSES } from '../case-shares.types';
import { ListCaseSharesQueryDto } from './list-case-shares-query.dto';

export class ListMyCaseSharesQueryDto extends ListCaseSharesQueryDto {
  @IsOptional()
  @IsIn(CASE_SHARE_STATUSES, { message: 'CASE_SHARE_STATUS_INVALID' })
  status?: string;
}
