import {
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

const STORE_PHOTO_OBJECT_KEY_PATTERN =
  /^stores\/photos\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)?$/;

export class CreateRestaurantDto {
  @IsString({ message: 'NAME_REQUIRED' })
  @Length(1, 255, { message: 'NAME_INVALID_LENGTH' })
  name!: string;

  @IsString({ message: 'ADDRESS_REQUIRED' })
  @Length(1, 255, { message: 'ADDRESS_INVALID_LENGTH' })
  address!: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  @Matches(STORE_PHOTO_OBJECT_KEY_PATTERN, {
    message: 'PHOTO_OBJECT_KEY_INVALID',
  })
  photoObjectKey?: string;
}
