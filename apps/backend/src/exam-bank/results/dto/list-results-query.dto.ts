import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../dto/pagination-query.dto';

export class ListResultsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'EXAM_TEMPLATE_INVALID' })
  templateId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'RESTAURANT_INVALID' })
  restaurantId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'USER_INVALID' })
  userId?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean({ message: 'EXAM_RESULT_PASSED_INVALID' })
  passed?: boolean;

  @IsOptional()
  @IsDateString({}, { message: 'EXAM_RESULT_DATE_INVALID' })
  from?: string;

  @IsOptional()
  @IsDateString({}, { message: 'EXAM_RESULT_DATE_INVALID' })
  to?: string;

  @IsOptional()
  @IsString({ message: 'EXAM_SEARCH_INVALID' })
  @MaxLength(100, { message: 'EXAM_SEARCH_INVALID' })
  q?: string;
}
