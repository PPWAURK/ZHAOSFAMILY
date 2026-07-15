import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  isRecipeImagePath,
  RecipeImagesService,
} from './recipe-images.service';

jest.mock('crypto', () => ({ randomUUID: jest.fn() }));
jest.mock('fs', () => ({ existsSync: jest.fn() }));
jest.mock('fs/promises', () => ({ mkdir: jest.fn(), writeFile: jest.fn() }));

const mockExistsSync = jest.mocked(existsSync);
const mockMkdir = jest.mocked(mkdir);
const mockRandomUUID = jest.mocked(randomUUID);
const mockWriteFile = jest.mocked(writeFile);

describe('RecipeImagesService', () => {
  const fileName = '123e4567-e89b-12d3-a456-426614174000.webp';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores an uploaded recipe image under the local uploads directory', async () => {
    const service = new RecipeImagesService();
    const buffer = Buffer.from('image data');
    mockRandomUUID.mockReturnValue('123e4567-e89b-12d3-a456-426614174000');

    const result = await service.saveImage({
      buffer,
      mimetype: 'image/webp',
    } as Express.Multer.File);

    expect(mockMkdir).toHaveBeenCalledWith(
      expect.stringContaining('uploads/images/recipes'),
      { recursive: true },
    );
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining(fileName),
      buffer,
    );
    expect(result).toEqual({ imagePath: `/recipes/images/${fileName}` });
  });

  it('rejects non-image upload paths and non-allowlisted files', async () => {
    const service = new RecipeImagesService();

    expect(isRecipeImagePath('https://example.com/recipe.jpg')).toBe(false);
    expect(isRecipeImagePath(`/recipes/images/${fileName}`)).toBe(true);
    await expect(
      service.saveImage({ mimetype: 'image/gif' } as Express.Multer.File),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('only resolves generated image file names that exist locally', () => {
    const service = new RecipeImagesService();
    mockExistsSync.mockReturnValue(true);

    expect(service.getImagePath(fileName)).toContain(fileName);
    expect(() => service.getImagePath('../outside.webp')).toThrow(
      NotFoundException,
    );
  });
});
