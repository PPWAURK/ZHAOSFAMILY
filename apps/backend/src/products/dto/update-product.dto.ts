import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'INVALID_SUPPLIER_ID' })
  @Min(1, { message: 'INVALID_SUPPLIER_ID' })
  supplierId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20, { message: 'CATEGORY_INVALID_LENGTH' })
  category?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255, { message: 'NAME_CN_INVALID_LENGTH' })
  nameCn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  designationFr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  unit?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'PRICE_INVALID' })
  @Min(0, { message: 'PRICE_INVALID' })
  unitPriceHt?: number;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  specification?: string;
}
