import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class UpdateSupplierDto {
  @IsOptional()
  @IsString({ message: 'NAME_INVALID' })
  @Length(1, 255, { message: 'NAME_INVALID_LENGTH' })
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'SORT_ORDER_INVALID' })
  @Min(0, { message: 'SORT_ORDER_INVALID' })
  sortOrder?: number;

  @IsOptional()
  @IsBoolean({ message: 'INCLUDE_ALL_INVALID' })
  includeAllProductsInOrder?: boolean;

  @IsOptional()
  @IsString({ message: 'ORDER_NOTICE_INVALID' })
  @Length(0, 2000, { message: 'ORDER_NOTICE_INVALID_LENGTH' })
  orderNotice?: string;
}
