import { Type } from 'class-transformer';
import { IsDefined, IsNumber, Min, ValidateNested } from 'class-validator';
import {
  RecipeLocalizedLabelDto,
  RecipeLocalizedUnitDto,
} from './recipe-localized-text.dto';

export class RecipeIngredientDto {
  @IsDefined({ message: 'RECIPE_INGREDIENT_NAME_REQUIRED' })
  @ValidateNested()
  @Type(() => RecipeLocalizedLabelDto)
  name!: RecipeLocalizedLabelDto;

  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'RECIPE_INGREDIENT_QUANTITY_INVALID' },
  )
  @Min(0, { message: 'RECIPE_INGREDIENT_QUANTITY_INVALID' })
  quantity!: number;

  @IsDefined({ message: 'RECIPE_INGREDIENT_UNIT_REQUIRED' })
  @ValidateNested()
  @Type(() => RecipeLocalizedUnitDto)
  unit!: RecipeLocalizedUnitDto;
}
