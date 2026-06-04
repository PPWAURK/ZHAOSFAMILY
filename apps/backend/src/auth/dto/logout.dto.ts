import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class LogoutDto {
  @IsOptional()
  @IsString()
  @MinLength(20, { message: 'INVALID_REFRESH_TOKEN' })
  @MaxLength(500)
  refreshToken?: string;
}
