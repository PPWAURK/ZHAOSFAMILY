import { IsIn } from 'class-validator';
import {
  WAITING_QUEUE_UPDATE_STATUSES,
  type WaitingQueueUpdateStatus,
} from '../waiting-queue.types';

export class UpdateWaitingQueueEntryStatusDto {
  @IsIn(WAITING_QUEUE_UPDATE_STATUSES, {
    message: 'INVALID_WAITING_QUEUE_STATUS',
  })
  status!: WaitingQueueUpdateStatus;
}
