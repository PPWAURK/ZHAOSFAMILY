import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { RECIPE_STATUSES } from '../recipes.types';
import { RecipeIngredientDto } from './recipe-ingredient.dto';
import {
  RecipeLocalizedLabelDto,
  RecipeLocalizedTagDto,
  RecipeLocalizedTextDto,
} from './recipe-localized-text.dto';
import { RecipeStepDto } from './recipe-step.dto';

export class UpdateRecipeDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => RecipeLocalizedLabelDto)
  name?: RecipeLocalizedLabelDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => RecipeLocalizedLabelDto)
  category?: RecipeLocalizedLabelDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => RecipeLocalizedTagDto)
  tags?: RecipeLocalizedTagDto[];

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'RECIPE_SERVINGS_INVALID' })
  @Min(1, { message: 'RECIPE_SERVINGS_INVALID' })
  servings?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'RECIPE_PREPARATION_MINUTES_INVALID' })
  @Min(0, { message: 'RECIPE_PREPARATION_MINUTES_INVALID' })
  preparationMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'RECIPE_COOKING_MINUTES_INVALID' })
  @Min(0, { message: 'RECIPE_COOKING_MINUTES_INVALID' })
  cookingMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  coverImageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  finishedImageUrl?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => RecipeLocalizedTextDto)
  note?: RecipeLocalizedTextDto;

  @IsOptional()
  @IsIn(RECIPE_STATUSES, { message: 'RECIPE_STATUS_INVALID' })
  status?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @Length(1, 80, { each: true })
  jobRoles?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientDto)
  ingredients?: RecipeIngredientDto[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => RecipeStepDto)
  steps?: RecipeStepDto[];
}
