import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SetBadgeImageDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  imageFileName!: string | null;
}
