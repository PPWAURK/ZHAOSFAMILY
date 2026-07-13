import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * Query for GET /media/sign. The objectKey is restricted to the shape produced
 * by MediaService.upload (`folder/YYYY/MM/uuid.ext`): a safe charset with no
 * `..` traversal segments, so we never sign an arbitrary or crafted key.
 */
export class SignMediaQueryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  @Matches(/^[A-Za-z0-9._/-]+$/, { message: 'INVALID_OBJECT_KEY' })
  @Matches(/^(?!.*\.\.).*$/, { message: 'INVALID_OBJECT_KEY' })
  objectKey!: string;
}
