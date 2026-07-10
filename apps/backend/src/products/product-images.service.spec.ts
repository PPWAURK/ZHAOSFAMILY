import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductImagesService } from './product-images.service';

jest.mock('fs', () => ({ existsSync: jest.fn() }));
jest.mock('fs/promises', () => ({ mkdir: jest.fn(), writeFile: jest.fn() }));
jest.mock('crypto', () => ({ randomUUID: jest.fn() }));

const mockExistsSync = jest.mocked(existsSync);
const mockMkdir = jest.mocked(mkdir);
const mockWriteFile = jest.mocked(writeFile);
const mockRandomUUID = jest.mocked(randomUUID);

describe('ProductImagesService', () => {
  const fileName = '123e4567-e89b-12d3-a456-426614174000.webp';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores an uploaded product image under the local uploads directory', async () => {
    mockRandomUUID.mockReturnValue('123e4567-e89b-12d3-a456-426614174000');
    const service = new ProductImagesService();
    const buffer = Buffer.from('image data');

    const result = await service.saveImage({
      buffer,
      mimetype: 'image/webp',
    } as Express.Multer.File);

    expect(mockMkdir).toHaveBeenCalledWith(
      expect.stringContaining('uploads/images/products'),
      { recursive: true },
    );
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining(fileName),
      buffer,
    );
    expect(result).toEqual({ imagePath: `/products/images/${fileName}` });
  });

  it('rejects file types outside the product image allowlist', async () => {
    const service = new ProductImagesService();

    await expect(
      service.saveImage({ mimetype: 'image/gif' } as Express.Multer.File),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('only resolves generated product image file names that exist locally', () => {
    const service = new ProductImagesService();
    mockExistsSync.mockReturnValue(true);

    expect(service.getImagePath(fileName)).toContain(fileName);
    expect(() => service.getImagePath('../outside.webp')).toThrow(
      NotFoundException,
    );
  });
});
