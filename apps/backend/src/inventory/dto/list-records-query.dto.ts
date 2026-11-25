import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  Matches,
  Min,
} from 'class-validator';

const MAX_SUPPLIERS = 20;

function toIdList(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(Number);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part !== '')
      .map(Number);
  }
  return value;
}

export class ListRecordsQueryDto {
  /** YYYY-MM; defaults to the current Paris month. */
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'MONTH_INVALID' })
  month?: string;

  /** Comma-separated supplier ids, e.g. "8,6". */
  @Transform(({ value }) => toIdList(value))
  @IsArray({ message: 'INVALID_SUPPLIER_ID' })
  @ArrayNotEmpty({ message: 'INVALID_SUPPLIER_ID' })
  @ArrayMaxSize(MAX_SUPPLIERS, { message: 'INVALID_SUPPLIER_ID' })
  @IsInt({ each: true, message: 'INVALID_SUPPLIER_ID' })
  @Min(1, { each: true, message: 'INVALID_SUPPLIER_ID' })
  supplierIds!: number[];

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'INVALID_RESTAURANT_ID' })
  @Min(1, { message: 'INVALID_RESTAURANT_ID' })
  restaurantId?: number;
}
