import { IsIn } from 'class-validator';
import { USAGE_MODULES } from '../analytics.types';

export class RecordUsageEventDto {
  @IsIn(USAGE_MODULES, { message: 'USAGE_MODULE_INVALID' })
  moduleName!: string;
}
