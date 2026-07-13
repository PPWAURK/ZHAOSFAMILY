import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { unlink } from 'fs/promises';
import * as path from 'path';
import type { Readable } from 'stream';
import { fixMojibakeFileName } from './media-filename.utils';
import { MinioService } from '../minio/minio.service';

export type UploadedMedia = {
  success: true;
  originalName: string;
  mimeType: string;
  size: number;
  bucket: string;
  folder: string;
  objectKey: string;
};

export type UploadMediaOptions = {
  folder?: string;
};

export type MediaFile = {
  stream: Readable;
  mimeType: string;
  size: number;
};

export type MediaFileMetadata = {
  mimeType: string;
  size: number;
};

function sanitizeFolder(folder: string | undefined): string {
  if (!folder) {
    return 'uploads';
  }

  const segments = folder
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => segment.replace(/[^a-zA-Z0-9_-]/g, '-'))
    .filter(Boolean);

  return segments.length > 0 ? segments.join('/') : 'uploads';
}

@Injectable()
export class MediaService {
  constructor(private readonly minioService: MinioService) {}

  async upload(
    file: Express.Multer.File,
    options: UploadMediaOptions = {},
  ): Promise<UploadedMedia> {
    const originalName = fixMojibakeFileName(file.originalname || '');
    const ext = path.extname(originalName);
    const now = new Date();
    const folder = sanitizeFolder(options.folder);
    const objectKey = [
      folder,
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      `${randomUUID()}${ext}`,
    ].join('/');

    const result = file.path
      ? await this.uploadTemporaryFile(file, objectKey)
      : await this.minioService.uploadFile({
          objectKey,
          buffer: file.buffer,
          mimeType: file.mimetype,
        });

    return {
      success: true,
      originalName,
      mimeType: file.mimetype,
      size: file.size,
      bucket: result.bucket,
      folder,
      objectKey: result.objectKey,
    };
  }

  private async uploadTemporaryFile(
    file: Express.Multer.File,
    objectKey: string,
  ): Promise<{ bucket: string; objectKey: string }> {
    try {
      return await this.minioService.uploadFilePath({
        objectKey,
        filePath: file.path,
        mimeType: file.mimetype,
      });
    } finally {
      await unlink(file.path).catch(() => undefined);
    }
  }

  async getSignedUrl(
    objectKey: string,
    expirySeconds: number,
  ): Promise<string> {
    return this.minioService.getPresignedGetUrl(objectKey, expirySeconds);
  }

  async getFile(objectKey: string): Promise<MediaFile> {
    const metadata = await this.getFileMetadata(objectKey);
    const stream = await this.minioService.getFileStream(objectKey);

    return {
      stream,
      mimeType: metadata.mimeType,
      size: metadata.size,
    };
  }

  async getFileRange(
    objectKey: string,
    start: number,
    end: number,
  ): Promise<MediaFile> {
    const metadata = await this.getFileMetadata(objectKey);
    const safeEnd = Math.min(end, metadata.size - 1);
    const length = safeEnd - start + 1;
    const stream = await this.minioService.getPartialFileStream(
      objectKey,
      start,
      length,
    );

    return {
      stream,
      mimeType: metadata.mimeType,
      size: metadata.size,
    };
  }

  async getFileMetadata(objectKey: string): Promise<MediaFileMetadata> {
    const stat = await this.minioService.statObject(objectKey);
    const metaData = (stat.metaData ?? {}) as Record<string, unknown>;
    const contentType = metaData['content-type'] ?? metaData['Content-Type'];

    return {
      mimeType:
        typeof contentType === 'string'
          ? contentType
          : 'application/octet-stream',
      size: stat.size,
    };
  }

  async deleteFile(objectKey: string): Promise<void> {
    await this.minioService.removeObject(objectKey);
  }
}
