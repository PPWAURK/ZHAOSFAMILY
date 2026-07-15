import { Type } from 'class-transformer';
import { IsDefined, ValidateNested } from 'class-validator';
import { RecipeLocalizedTextDto } from './recipe-localized-text.dto';

export class RecipeStepDto {
  @IsDefined({ message: 'RECIPE_STEP_REQUIRED' })
  @ValidateNested()
  @Type(() => RecipeLocalizedTextDto)
  instruction!: RecipeLocalizedTextDto;
}
