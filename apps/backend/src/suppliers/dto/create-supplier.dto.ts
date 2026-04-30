import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreateSupplierDto {
  @IsString({ message: 'NAME_REQUIRED' })
  @Length(1, 255, { message: 'NAME_INVALID_LENGTH' })
  name!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'SORT_ORDER_INVALID' })
  @Min(0, { message: 'SORT_ORDER_INVALID' })
  sortOrder?: number;

  @IsOptional()
  @IsBoolean({ message: 'INCLUDE_ALL_INVALID' })
  includeAllProductsInOrder?: boolean;
}
