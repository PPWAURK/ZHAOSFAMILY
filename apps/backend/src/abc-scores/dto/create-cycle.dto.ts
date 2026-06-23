import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCycleDto {
  @IsString()
  @MinLength(1, { message: 'INVALID_CYCLE_LABEL' })
  @MaxLength(120, { message: 'INVALID_CYCLE_LABEL' })
  label!: string;
}
