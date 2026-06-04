import { Logger, ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { MinioService } from './minio.service';

const mockClient = {
  bucketExists: jest.fn(),
  makeBucket: jest.fn(),
  putObject: jest.fn(),
  fPutObject: jest.fn(),
  getObject: jest.fn(),
  getPartialObject: jest.fn(),
  statObject: jest.fn(),
  removeObject: jest.fn(),
};

jest.mock('minio', () => ({
  Client: jest.fn(() => mockClient),
}));

function createService(
  configOverrides: Record<string, string> = {},
): MinioService {
  const config: Record<string, string> = {
    MINIO_ENDPOINT: '127.0.0.1',
    MINIO_PORT: '9000',
    MINIO_USE_SSL: 'false',
    MINIO_ACCESS_KEY: 'minioadmin',
    MINIO_SECRET_KEY: 'change_this_password',
    MINIO_BUCKET: 'company-private-files',
    ...configOverrides,
  };
  const configService = {
    get: jest.fn(
      (key: string, fallback?: string): string | undefined =>
        config[key] ?? fallback,
    ),
  };

  return new MinioService(configService as unknown as ConfigService);
}

describe('MinioService', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('does not reject module initialization when MinIO is unavailable', async () => {
    const service = createService();
    mockClient.bucketExists.mockRejectedValueOnce(
      new Error('connect ECONNREFUSED 127.0.0.1:9000'),
    );

    await expect(service.onModuleInit()).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      'MinIO storage is unavailable: connect ECONNREFUSED 127.0.0.1:9000',
    );
  });

  it('returns a service unavailable error when storage is still unreachable', async () => {
    const service = createService();
    mockClient.bucketExists.mockRejectedValueOnce(
      new Error('connect ECONNREFUSED 127.0.0.1:9000'),
    );

    await expect(
      service.uploadFile({
        objectKey: 'uploads/file.txt',
        buffer: Buffer.from('file'),
        mimeType: 'text/plain',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(mockClient.putObject).not.toHaveBeenCalled();
  });

  it('creates the bucket before uploading when the bucket is missing', async () => {
    const service = createService();
    mockClient.bucketExists.mockResolvedValueOnce(false);
    mockClient.makeBucket.mockResolvedValueOnce(undefined);
    mockClient.putObject.mockResolvedValueOnce(undefined);

    await expect(
      service.uploadFile({
        objectKey: 'uploads/file.txt',
        buffer: Buffer.from('file'),
        mimeType: 'text/plain',
      }),
    ).resolves.toEqual({
      bucket: 'company-private-files',
      objectKey: 'uploads/file.txt',
    });

    expect(mockClient.makeBucket).toHaveBeenCalledWith(
      'company-private-files',
      'us-east-1',
    );
    expect(mockClient.putObject).toHaveBeenCalledWith(
      'company-private-files',
      'uploads/file.txt',
      Buffer.from('file'),
      4,
      {
        'Content-Type': 'text/plain',
      },
    );
  });
});
