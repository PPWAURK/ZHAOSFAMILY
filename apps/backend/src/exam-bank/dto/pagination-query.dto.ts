import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'INVALID_PAGE' })
  @Min(1, { message: 'INVALID_PAGE' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'INVALID_PAGE_SIZE' })
  @Min(1, { message: 'INVALID_PAGE_SIZE' })
  @Max(1000, { message: 'INVALID_PAGE_SIZE' })
  pageSize?: number;
}

export function resolvePage(
  query: PaginationQueryDto,
  defaultSize = 20,
): { page: number; pageSize: number; skip: number } {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? defaultSize;
  return { page, pageSize, skip: (page - 1) * pageSize };
}
