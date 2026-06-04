import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JOB_ROLE_PATTERN } from '../job-roles';

const LANGUAGE_VALUES = ['zh', 'en', 'fr'] as const;

export class RegisterDto {
  @IsString()
  @MaxLength(100)
  familyName!: string;

  @IsString()
  @MaxLength(100)
  givenName!: string;

  @IsEmail({}, { message: 'INVALID_EMAIL' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'PASSWORD_TOO_SHORT' })
  @MaxLength(200)
  password!: string;

  @Type(() => Number)
  @IsInt({ message: 'RESTAURANT_REQUIRED' })
  @Min(1, { message: 'RESTAURANT_REQUIRED' })
  restaurantId!: number;

  @IsOptional()
  @IsDateString({}, { message: 'INVALID_BIRTHDAY' })
  birthday?: string;

  @IsOptional()
  @Matches(JOB_ROLE_PATTERN, { message: 'INVALID_JOB_ROLE' })
  jobRole?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5_000_000, { message: 'PROFILE_PHOTO_TOO_LARGE' })
  profilePhotoDataUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'INVALID_USER_LEVEL' })
  @Min(0, { message: 'INVALID_USER_LEVEL' })
  @Max(7, { message: 'INVALID_USER_LEVEL' })
  level?: number;

  @IsBoolean({ message: 'TERMS_NOT_ACCEPTED' })
  acceptedTerms!: boolean;

  @IsIn(LANGUAGE_VALUES, { message: 'INVALID_LANGUAGE' })
  language!: (typeof LANGUAGE_VALUES)[number];
}
