import { Type } from 'class-transformer';
import { IsInt, IsString, Length, Matches, Min } from 'class-validator';

export class CreateTrainingPositionDto {
  @IsString({ message: 'INVALID_TRAINING_POSITION_CODE' })
  @Length(2, 40, { message: 'INVALID_TRAINING_POSITION_CODE' })
  @Matches(/^[A-Z0-9_]+$/, { message: 'INVALID_TRAINING_POSITION_CODE' })
  code!: string;

  @IsString()
  @Length(1, 100)
  nameZh!: string;

  @IsString()
  @Length(1, 100)
  nameEn!: string;

  @IsString()
  @Length(1, 100)
  nameFr!: string;

  @IsString({ message: 'INVALID_TRAINING_POSITION_PARENT' })
  @Length(2, 40, { message: 'INVALID_TRAINING_POSITION_PARENT' })
  @Matches(/^[A-Z0-9_]+$/, { message: 'INVALID_TRAINING_POSITION_PARENT' })
  parentCode!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder!: number;
}
