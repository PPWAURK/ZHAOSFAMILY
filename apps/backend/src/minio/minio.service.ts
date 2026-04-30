import {
  Injectable,
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

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly bucket: string;
  private readonly client: Minio.Client;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('MINIO_BUCKET', '');

    this.client = new Minio.Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT', '127.0.0.1'),
      port: Number(this.configService.get<string>('MINIO_PORT', '9000')),
      useSSL:
        this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true',
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY', ''),
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY', ''),
    });
  }

  async onModuleInit(): Promise<void> {
    if (!this.isConfigured()) {
      return;
    }

    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket, 'us-east-1');
    }
  }

  async uploadFile(params: {
    objectKey: string;
    buffer: Buffer;
    mimeType?: string;
  }): Promise<UploadedObject> {
    this.assertConfigured();

    const { objectKey, buffer, mimeType } = params;

    await this.client.putObject(this.bucket, objectKey, buffer, buffer.length, {
      'Content-Type': mimeType || 'application/octet-stream',
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
    this.assertConfigured();

    const { objectKey, filePath, mimeType } = params;

    await this.client.fPutObject(this.bucket, objectKey, filePath, {
      'Content-Type': mimeType || 'application/octet-stream',
    });

    return {
      bucket: this.bucket,
      objectKey,
    };
  }

  async getFileStream(objectKey: string): Promise<Readable> {
    this.assertConfigured();

    return this.client.getObject(this.bucket, objectKey);
  }

  async getPartialFileStream(
    objectKey: string,
    offset: number,
    length: number,
  ): Promise<Readable> {
    this.assertConfigured();

    return this.client.getPartialObject(this.bucket, objectKey, offset, length);
  }

  async statObject(
    objectKey: string,
  ): Promise<Awaited<ReturnType<Minio.Client['statObject']>>> {
    this.assertConfigured();

    return this.client.statObject(this.bucket, objectKey);
  }

  async removeObject(objectKey: string): Promise<void> {
    this.assertConfigured();

    await this.client.removeObject(this.bucket, objectKey);
  }

  private isConfigured(): boolean {
    return Boolean(
      this.bucket &&
      this.configService.get<string>('MINIO_ACCESS_KEY') &&
      this.configService.get<string>('MINIO_SECRET_KEY'),
    );
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('MINIO_NOT_CONFIGURED');
    }
  }
}
