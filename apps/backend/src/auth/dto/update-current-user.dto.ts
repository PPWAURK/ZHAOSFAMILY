import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const PROFILE_PHOTO_DATA_URL_PATTERN = /^data:image\/[a-zA-Z0-9.+-]+;base64,/;

export class UpdateCurrentUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  @Matches(PROFILE_PHOTO_DATA_URL_PATTERN, {
    message: 'INVALID_PROFILE_PHOTO',
  })
  @MaxLength(5_000_000, { message: 'PROFILE_PHOTO_TOO_LARGE' })
  profilePhotoDataUrl?: string;
}
