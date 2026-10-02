import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsIn, IsInt, Min } from 'class-validator';

export const SUPPLIER_AVAILABILITY_SCOPES = ['all', 'selected'] as const;

export type SupplierAvailabilityScope =
  (typeof SUPPLIER_AVAILABILITY_SCOPES)[number];

export class UpdateSupplierAvailabilityDto {
  @IsIn(SUPPLIER_AVAILABILITY_SCOPES, {
    message: 'SUPPLIER_AVAILABILITY_SCOPE_INVALID',
  })
  scope!: SupplierAvailabilityScope;

  @IsArray({ message: 'RESTAURANT_IDS_INVALID' })
  @ArrayUnique({ message: 'RESTAURANT_IDS_DUPLICATED' })
  @Type(() => Number)
  @IsInt({ each: true, message: 'RESTAURANT_IDS_INVALID' })
  @Min(1, { each: true, message: 'RESTAURANT_IDS_INVALID' })
  restaurantIds!: number[];
}
