import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class UpsertJobRolePositionDto {
  @IsString({ message: 'TRAINING_POSITION_NOT_FOUND' })
  @Length(2, 40, { message: 'TRAINING_POSITION_NOT_FOUND' })
  @Matches(/^[A-Z0-9_]+$/, { message: 'TRAINING_POSITION_NOT_FOUND' })
  positionCode!: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeDescendants?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  grantsAllPositions?: boolean;
}
