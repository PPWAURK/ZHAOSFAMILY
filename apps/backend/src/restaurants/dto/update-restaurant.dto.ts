import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class UpdateRestaurantDto {
  @IsOptional()
  @IsString({ message: 'NAME_REQUIRED' })
  @Length(1, 255, { message: 'NAME_INVALID_LENGTH' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'ADDRESS_REQUIRED' })
  @Length(1, 255, { message: 'ADDRESS_INVALID_LENGTH' })
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  photoUrl?: string;
}
