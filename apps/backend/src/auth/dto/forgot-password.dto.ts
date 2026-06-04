import { IsEmail, IsIn, IsOptional } from 'class-validator';

const SUPPORTED_RESET_PASSWORD_LANGUAGES = ['zh', 'en', 'fr'] as const;

export type ResetPasswordLanguage =
  (typeof SUPPORTED_RESET_PASSWORD_LANGUAGES)[number];

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'INVALID_EMAIL' })
  email!: string;

  @IsOptional()
  @IsIn(SUPPORTED_RESET_PASSWORD_LANGUAGES)
  language?: ResetPasswordLanguage;
}
