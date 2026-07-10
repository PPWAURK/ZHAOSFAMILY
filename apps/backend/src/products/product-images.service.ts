import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import * as path from 'path';

const PRODUCT_IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const PRODUCT_IMAGE_NAME_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

export type UploadedProductImage = {
  imagePath: string;
};

@Injectable()
export class ProductImagesService {
  async saveImage(file: Express.Multer.File): Promise<UploadedProductImage> {
    const extension = PRODUCT_IMAGE_EXTENSIONS[file.mimetype];

    if (!extension) {
      throw new BadRequestException('PRODUCT_IMAGE_TYPE_NOT_ALLOWED');
    }

    const fileName = `${randomUUID()}.${extension}`;
    const directory = this.getStorageDirectory();

    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, fileName), file.buffer);

    return { imagePath: `/products/images/${fileName}` };
  }

  getImagePath(fileName: string): string {
    if (!PRODUCT_IMAGE_NAME_PATTERN.test(fileName)) {
      throw new NotFoundException('PRODUCT_IMAGE_NOT_FOUND');
    }

    const filePath = path.join(this.getStorageDirectory(), fileName);

    if (!existsSync(filePath)) {
      throw new NotFoundException('PRODUCT_IMAGE_NOT_FOUND');
    }

    return filePath;
  }

  private getStorageDirectory(): string {
    return path.join(process.cwd(), 'uploads', 'images', 'products');
  }
}
