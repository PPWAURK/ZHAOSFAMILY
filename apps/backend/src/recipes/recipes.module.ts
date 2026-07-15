import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RecipeImagesService } from './recipe-images.service';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [RecipesController],
  providers: [RecipeImagesService, RecipesService],
})
export class RecipesModule {}
