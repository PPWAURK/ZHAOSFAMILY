import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AttachMediaDto {
  @IsString()
  @MinLength(1, { message: 'INVALID_OBJECT_KEY' })
  @MaxLength(512, { message: 'INVALID_OBJECT_KEY' })
  objectKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;
}
