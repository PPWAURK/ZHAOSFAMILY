import { IsIn } from 'class-validator';
import { MOBILE_USAGE_MODULES } from '../analytics.types';

export class RecordMobileUsageDto {
  @IsIn(MOBILE_USAGE_MODULES, { message: 'MOBILE_USAGE_MODULE_INVALID' })
  moduleName!: string;
}
