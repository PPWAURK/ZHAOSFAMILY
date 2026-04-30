import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class ListInventoryQueryDto {
  @Type(() => Number)
  @IsInt({ message: 'INVALID_SUPPLIER_ID' })
  @Min(1, { message: 'INVALID_SUPPLIER_ID' })
  supplierId!: number;
}
