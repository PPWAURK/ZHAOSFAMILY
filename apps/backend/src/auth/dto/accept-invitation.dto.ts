import { IsString, MaxLength, MinLength } from 'class-validator';

export class AcceptInvitationDto {
  @IsString()
  @MinLength(20, { message: 'INVALID_INVITATION_TOKEN' })
  @MaxLength(500)
  token!: string;

  @IsString()
  @MinLength(1, { message: 'NAME_REQUIRED' })
  @MaxLength(200)
  name!: string;

  @IsString()
  @MinLength(8, { message: 'PASSWORD_TOO_SHORT' })
  @MaxLength(200)
  password!: string;
}
