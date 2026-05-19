import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class CreateRestaurantDto {
  @IsString({ message: 'NAME_REQUIRED' })
  @Length(1, 255, { message: 'NAME_INVALID_LENGTH' })
  name!: string;

  @IsString({ message: 'ADDRESS_REQUIRED' })
  @Length(1, 255, { message: 'ADDRESS_INVALID_LENGTH' })
  address!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  photoUrl?: string;
}
