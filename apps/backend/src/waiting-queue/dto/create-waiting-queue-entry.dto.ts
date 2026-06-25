import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateWaitingQueueEntryDto {
  @IsString()
  @Length(1, 100, { message: 'INVALID_CUSTOMER_NAME' })
  customerName!: string;

  @Type(() => Number)
  @IsInt({ message: 'INVALID_PARTY_SIZE' })
  @Min(1, { message: 'INVALID_PARTY_SIZE' })
  partySize!: number;

  @IsOptional()
  @IsBoolean()
  hasDisabled?: boolean;

  @IsOptional()
  @IsBoolean()
  hasPregnant?: boolean;

  @IsOptional()
  @IsBoolean()
  hasElderly?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
