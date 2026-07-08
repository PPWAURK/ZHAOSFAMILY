import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class ListProductsQueryDto {
  @Type(() => Number)
  @IsInt({ message: 'INVALID_SUPPLIER_ID' })
  @Min(1, { message: 'INVALID_SUPPLIER_ID' })
  supplierId!: number;

  // Include off-shelf (inactive) products. Defaults to false so order/consumer
  // flows only ever see products that are on the shelf.
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  includeInactive?: boolean;
}
