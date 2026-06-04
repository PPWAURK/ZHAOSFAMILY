import { IsString, MaxLength, MinLength } from 'class-validator';

export class RefreshSessionDto {
  @IsString()
  @MinLength(20, { message: 'INVALID_REFRESH_TOKEN' })
  @MaxLength(500)
  refreshToken!: string;
}
