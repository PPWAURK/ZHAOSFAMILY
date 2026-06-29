import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import type { Readable } from 'stream';

export type UploadedObject = {
  bucket: string;
  objectKey: string;
};

type StorageError = Error & {
  code?: unknown;
  statusCode?: unknown;
};

const STORAGE_UNAVAILABLE_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
]);

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private readonly bucket: string;
  private readonly client: Minio.Client;
  private isBucketReady = false;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('MINIO_BUCKET', '');

    this.client = new Minio.Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT', '127.0.0.1'),
      port: Number(this.configService.get<string>('MINIO_PORT', '9000')),
      useSSL:
        this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true',
      region: this.configService.get<string>('MINIO_REGION', 'us-east-1'),
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY', ''),
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY', ''),
    });
  }

  async onModuleInit(): Promise<void> {
    if (!this.isConfigured()) {
      return;
    }

    try {
      await this.prepareBucket();
    } catch (error) {
      this.logStorageUnavailable(error);
    }
  }

  async uploadFile(params: {
    objectKey: string;
    buffer: Buffer;
    mimeType?: string;
  }): Promise<UploadedObject> {
    const { objectKey, buffer, mimeType } = params;

    await this.runStorageOperation(async () => {
      await this.client.putObject(
        this.bucket,
        objectKey,
        buffer,
        buffer.length,
        {
          'Content-Type': mimeType || 'application/octet-stream',
        },
      );
    });

    return {
      bucket: this.bucket,
      objectKey,
    };
  }

  async uploadFilePath(params: {
    objectKey: string;
    filePath: string;
    mimeType?: string;
  }): Promise<UploadedObject> {
    const { objectKey, filePath, mimeType } = params;

    await this.runStorageOperation(async () => {
      await this.client.fPutObject(this.bucket, objectKey, filePath, {
        'Content-Type': mimeType || 'application/octet-stream',
      });
    });

    return {
      bucket: this.bucket,
      objectKey,
    };
  }

  async getFileStream(objectKey: string): Promise<Readable> {
    return this.runStorageOperation(() =>
      this.client.getObject(this.bucket, objectKey),
    );
  }

  async getPartialFileStream(
    objectKey: string,
    offset: number,
    length: number,
  ): Promise<Readable> {
    return this.runStorageOperation(() =>
      this.client.getPartialObject(this.bucket, objectKey, offset, length),
    );
  }

  async statObject(
    objectKey: string,
  ): Promise<Awaited<ReturnType<Minio.Client['statObject']>>> {
    try {
      return await this.runStorageOperation(() =>
        this.client.statObject(this.bucket, objectKey),
      );
    } catch (error) {
      if (this.isObjectNotFoundError(error)) {
        throw new NotFoundException('OBJECT_NOT_FOUND');
      }

      throw error;
    }
  }

  private isObjectNotFoundError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const storageError = error as StorageError;
    return (
      storageError.code === 'NotFound' || storageError.statusCode === 404
    );
  }

  async removeObject(objectKey: string): Promise<void> {
    await this.runStorageOperation(() =>
      this.client.removeObject(this.bucket, objectKey),
    );
  }

  private isConfigured(): boolean {
    return Boolean(
      this.bucket &&
      this.configService.get<string>('MINIO_ACCESS_KEY') &&
      this.configService.get<string>('MINIO_SECRET_KEY'),
    );
  }

  private async runStorageOperation<T>(
    operation: () => Promise<T>,
  ): Promise<T> {
    await this.assertStorageReady();

    try {
      return await operation();
    } catch (error) {
      if (this.isStorageUnavailableError(error)) {
        this.isBucketReady = false;
        this.logStorageUnavailable(error);
        throw new ServiceUnavailableException('MINIO_UNAVAILABLE');
      }

      throw error;
    }
  }

  private async assertStorageReady(): Promise<void> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('MINIO_NOT_CONFIGURED');
    }

    if (this.isBucketReady) {
      return;
    }

    try {
      await this.prepareBucket();
    } catch (error) {
      this.logStorageUnavailable(error);
      throw new ServiceUnavailableException('MINIO_UNAVAILABLE');
    }
  }

  private async prepareBucket(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(
        this.bucket,
        this.configService.get<string>('MINIO_REGION', 'us-east-1'),
      );
    }

    this.isBucketReady = true;
  }

  private logStorageUnavailable(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.warn(`MinIO storage is unavailable: ${message}`);
  }

  private isStorageUnavailableError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return true;
    }

    const storageError = error as StorageError;
    const code =
      typeof storageError.code === 'string' ? storageError.code : undefined;
    const statusCode =
      typeof storageError.statusCode === 'number'
        ? storageError.statusCode
        : undefined;

    return Boolean(
      (code && STORAGE_UNAVAILABLE_ERROR_CODES.has(code)) ||
      (statusCode && statusCode >= 500),
    );
  }
}
