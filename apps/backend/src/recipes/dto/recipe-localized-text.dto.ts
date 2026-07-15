import { IsString, Length } from 'class-validator';

export class RecipeLocalizedTextDto {
  @IsString()
  @Length(1, 3000, { message: 'RECIPE_TEXT_ZH_REQUIRED' })
  zh!: string;

  @IsString()
  @Length(1, 3000, { message: 'RECIPE_TEXT_FR_REQUIRED' })
  fr!: string;
}

export class RecipeLocalizedLabelDto {
  @IsString()
  @Length(1, 255, { message: 'RECIPE_LABEL_ZH_INVALID' })
  zh!: string;

  @IsString()
  @Length(1, 255, { message: 'RECIPE_LABEL_FR_INVALID' })
  fr!: string;
}

export class RecipeLocalizedTagDto {
  @IsString()
  @Length(1, 50, { message: 'RECIPE_TAG_ZH_INVALID' })
  zh!: string;

  @IsString()
  @Length(1, 50, { message: 'RECIPE_TAG_FR_INVALID' })
  fr!: string;
}

export class RecipeLocalizedUnitDto {
  @IsString()
  @Length(1, 30, { message: 'RECIPE_UNIT_ZH_INVALID' })
  zh!: string;

  @IsString()
  @Length(1, 30, { message: 'RECIPE_UNIT_FR_INVALID' })
  fr!: string;
}
