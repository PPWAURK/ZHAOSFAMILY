import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt } from 'class-validator';

export class UpdateTrainingBadgeRequirementsDto {
  @IsArray({ message: 'INVALID_TRAINING_BADGE_REQUIREMENTS' })
  @ArrayMaxSize(50, { message: 'TOO_MANY_TRAINING_BADGE_REQUIREMENTS' })
  @Type(() => Number)
  @IsInt({ each: true, message: 'INVALID_TRAINING_BADGE_REQUIREMENT' })
  materialIds!: number[];
}
