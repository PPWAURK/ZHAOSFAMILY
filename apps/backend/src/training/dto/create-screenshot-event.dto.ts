import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const SCREEN_SECURITY_EVENT_TYPES = ['screenshot', 'recording'] as const;

export type ScreenSecurityEventType =
  (typeof SCREEN_SECURITY_EVENT_TYPES)[number];

export class CreateScreenSecurityEventDto {
  @IsOptional()
  @IsIn(SCREEN_SECURITY_EVENT_TYPES, {
    message: 'INVALID_SCREEN_SECURITY_EVENT_TYPE',
  })
  eventType?: ScreenSecurityEventType;

  @IsOptional()
  @IsString({ message: 'INVALID_SCREEN_SECURITY_SCREEN_NAME' })
  @MaxLength(100, { message: 'INVALID_SCREEN_SECURITY_SCREEN_NAME' })
  screenName?: string | null;

  @IsOptional()
  @IsObject({ message: 'INVALID_SCREEN_SECURITY_DEVICE_INFO' })
  deviceInfo?: Record<string, unknown> | null;
}
