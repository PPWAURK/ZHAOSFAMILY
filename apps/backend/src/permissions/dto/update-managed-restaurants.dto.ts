import { ArrayUnique, IsArray, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateManagedRestaurantsDto {
  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true, message: 'INVALID_RESTAURANT' })
  @Min(1, { each: true, message: 'INVALID_RESTAURANT' })
  restaurantIds!: number[];
}
