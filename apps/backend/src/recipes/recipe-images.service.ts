import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import * as path from 'path';

const RECIPE_IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const RECIPE_IMAGE_NAME_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;
const RECIPE_IMAGE_PATH_PREFIX = '/recipes/images/';

export type UploadedRecipeImage = {
  imagePath: string;
};

export function isRecipeImagePath(value: string): boolean {
  if (!value.startsWith(RECIPE_IMAGE_PATH_PREFIX)) {
    return false;
  }

  return RECIPE_IMAGE_NAME_PATTERN.test(
    value.slice(RECIPE_IMAGE_PATH_PREFIX.length),
  );
}

@Injectable()
export class RecipeImagesService {
  async saveImage(file: Express.Multer.File): Promise<UploadedRecipeImage> {
    const extension = RECIPE_IMAGE_EXTENSIONS[file.mimetype];

    if (!extension) {
      throw new BadRequestException('RECIPE_IMAGE_TYPE_NOT_ALLOWED');
    }

    const fileName = `${randomUUID()}.${extension}`;
    const directory = this.getStorageDirectory();

    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, fileName), file.buffer);

    return { imagePath: `${RECIPE_IMAGE_PATH_PREFIX}${fileName}` };
  }

  getImagePath(fileName: string): string {
    if (!RECIPE_IMAGE_NAME_PATTERN.test(fileName)) {
      throw new NotFoundException('RECIPE_IMAGE_NOT_FOUND');
    }

    const filePath = path.join(this.getStorageDirectory(), fileName);

    if (!existsSync(filePath)) {
      throw new NotFoundException('RECIPE_IMAGE_NOT_FOUND');
    }

    return filePath;
  }

  private getStorageDirectory(): string {
    return path.join(process.cwd(), 'uploads', 'images', 'recipes');
  }
}
