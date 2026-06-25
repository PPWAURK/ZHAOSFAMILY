import { IsIn, IsOptional } from 'class-validator';
import {
  WAITING_QUEUE_STATUSES,
  type WaitingQueueStatus,
} from '../waiting-queue.types';

export class ListWaitingQueueQueryDto {
  @IsOptional()
  @IsIn(WAITING_QUEUE_STATUSES, { message: 'INVALID_WAITING_QUEUE_STATUS' })
  status?: WaitingQueueStatus;
}
