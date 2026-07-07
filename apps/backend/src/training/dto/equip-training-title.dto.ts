import { IsOptional, IsString, MaxLength } from 'class-validator';

export class EquipTrainingTitleDto {
  @IsOptional()
  @IsString({ message: 'INVALID_TRAINING_TITLE_CODE' })
  @MaxLength(40, { message: 'TRAINING_TITLE_CODE_TOO_LONG' })
  code?: string | null;
}
