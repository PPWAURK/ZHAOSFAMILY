import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  PUSH_TOKEN_PLATFORMS,
  type PushTokenPlatform,
} from '../notifications.types';

export class RegisterPushTokenDto {
  @IsString()
  @MaxLength(255)
  token!: string;

  @IsIn(PUSH_TOKEN_PLATFORMS, { message: 'INVALID_PUSH_PLATFORM' })
  platform!: PushTokenPlatform;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceName?: string;
}
