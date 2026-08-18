import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsInt,
  IsString,
  Min,
} from 'class-validator';

export class ReorderProductsDto {
  @Type(() => Number)
  @IsInt({ message: 'INVALID_SUPPLIER_ID' })
  @Min(1, { message: 'INVALID_SUPPLIER_ID' })
  supplierId!: number;

  @IsArray({ message: 'INVALID_PRODUCT_ORDER' })
  @ArrayNotEmpty({ message: 'INVALID_PRODUCT_ORDER' })
  @ArrayUnique({ message: 'INVALID_PRODUCT_ORDER' })
  @IsString({ each: true, message: 'INVALID_PRODUCT_ORDER' })
  productIds!: string[];
}
