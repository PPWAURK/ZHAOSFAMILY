import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateMovementDto {
  @Type(() => Number)
  @IsInt({ message: 'INVALID_PRODUCT_ID' })
  @Min(1, { message: 'INVALID_PRODUCT_ID' })
  productId!: number;

  @Type(() => Number)
  @IsInt({ message: 'DELTA_INVALID' })
  @IsNotEmpty({ message: 'DELTA_REQUIRED' })
  delta!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sourceId?: string;
}
