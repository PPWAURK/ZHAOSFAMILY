import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import multer from 'multer';
import type { Response } from 'express';
import { AuthService } from '../auth/auth.service';
import { Public } from '../auth/decorators/public.decorator';
import { parseBearerToken } from '../auth/auth-token.utils';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { ListRecipesQueryDto } from './dto/list-recipes-query.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import {
  RecipeImagesService,
  type UploadedRecipeImage,
} from './recipe-images.service';
import { RecipesService } from './recipes.service';
import type { RecipeActor, RecipeItem } from './recipes.types';

const RECIPE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const RECIPE_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

@Controller('recipes')
export class RecipesController {
  constructor(
    private readonly authService: AuthService,
    private readonly recipesService: RecipesService,
    private readonly recipeImagesService: RecipeImagesService,
  ) {}

  @Post('images')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: { fileSize: RECIPE_IMAGE_MAX_BYTES },
      fileFilter: (_request, file, callback) => {
        if (!RECIPE_IMAGE_MIME_TYPES.has(file.mimetype)) {
          callback(
            new BadRequestException('RECIPE_IMAGE_TYPE_NOT_ALLOWED'),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  async uploadImage(
    @Headers('authorization') authorization: string | undefined,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<UploadedRecipeImage> {
    this.recipesService.ensureCanManage(await this.getActor(authorization));

    if (!file) {
      throw new BadRequestException('RECIPE_IMAGE_FILE_REQUIRED');
    }

    return this.recipeImagesService.saveImage(file);
  }

  @Public()
  @Get('images/:fileName')
  getImage(
    @Param('fileName') fileName: string,
    @Res() response: Response,
  ): void {
    const filePath = this.recipeImagesService.getImagePath(fileName);

    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    response.sendFile(filePath);
  }

  @Get()
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: ListRecipesQueryDto,
  ): Promise<RecipeItem[]> {
    return this.recipesService.list(await this.getActor(authorization), query);
  }

  @Get(':id')
  async get(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<RecipeItem> {
    return this.recipesService.get(await this.getActor(authorization), id);
  }

  @Post()
  async create(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: CreateRecipeDto,
  ): Promise<RecipeItem> {
    return this.recipesService.create(await this.getActor(authorization), dto);
  }

  @Patch(':id')
  async update(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRecipeDto,
  ): Promise<RecipeItem> {
    return this.recipesService.update(
      await this.getActor(authorization),
      id,
      dto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.recipesService.remove(await this.getActor(authorization), id);
  }

  private async getActor(
    authorization: string | undefined,
  ): Promise<RecipeActor> {
    const user = await this.authService.getCurrentUser(
      parseBearerToken(authorization),
    );

    return {
      id: user.id,
      jobRole: user.jobRole,
      permissions: user.permissions,
    };
  }
}
