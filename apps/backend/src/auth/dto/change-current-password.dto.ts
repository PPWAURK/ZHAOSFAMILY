import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangeCurrentPasswordDto {
  @IsString()
  @MinLength(8, { message: 'PASSWORD_TOO_SHORT' })
  @MaxLength(200)
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'PASSWORD_TOO_SHORT' })
  @MaxLength(200)
  nextPassword!: string;
}
