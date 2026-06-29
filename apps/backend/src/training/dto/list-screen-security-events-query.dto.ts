import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class ListScreenSecurityEventsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'INVALID_SCREEN_SECURITY_EVENT_PAGE' })
  @Min(1, { message: 'INVALID_SCREEN_SECURITY_EVENT_PAGE' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'INVALID_SCREEN_SECURITY_EVENT_PAGE_SIZE' })
  @Min(1, { message: 'INVALID_SCREEN_SECURITY_EVENT_PAGE_SIZE' })
  pageSize?: number;

  @IsOptional()
  @IsIn(['screenshot', 'recording'], {
    message: 'INVALID_SCREEN_SECURITY_EVENT_TYPE',
  })
  eventType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'INVALID_SCREEN_SECURITY_EVENT_USER_ID' })
  userId?: number;

  @IsOptional()
  @IsString({ message: 'INVALID_SCREEN_SECURITY_EVENT_DATE_FROM' })
  dateFrom?: string;

  @IsOptional()
  @IsString({ message: 'INVALID_SCREEN_SECURITY_EVENT_DATE_TO' })
  dateTo?: string;
}
