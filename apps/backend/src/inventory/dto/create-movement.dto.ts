import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
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

  /** Business date YYYY-MM-DD (Paris); defaults to now. */
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, {
    message: 'OCCURRED_ON_INVALID',
  })
  occurredOn?: string;

  /** Destination store, outbound movements only. */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'INVALID_RESTAURANT_ID' })
  @Min(1, { message: 'INVALID_RESTAURANT_ID' })
  restaurantId?: number;
}
