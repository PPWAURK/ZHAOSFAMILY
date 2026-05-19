import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @MinLength(20, { message: 'INVALID_RESET_TOKEN' })
  @MaxLength(500)
  token!: string;

  @IsString()
  @MinLength(8, { message: 'PASSWORD_TOO_SHORT' })
  @MaxLength(200)
  password!: string;
}
