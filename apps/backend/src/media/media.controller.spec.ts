import type { Request, Response } from 'express';
import type { Readable } from 'stream';
import { MediaController } from './media.controller';

function createResponseMock(): Response & {
  end: jest.Mock;
  setHeader: jest.Mock;
  status: jest.Mock;
} {
  const response = {
    end: jest.fn(),
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
  };

  return response as unknown as Response & {
    end: jest.Mock;
    setHeader: jest.Mock;
    status: jest.Mock;
  };
}

function createStreamMock(): Readable & { pipe: jest.Mock } {
  return { pipe: jest.fn() } as unknown as Readable & { pipe: jest.Mock };
}

function createRequest(range?: string): Request {
  return {
    headers: {
      authorization: 'Bearer test-token',
      ...(range ? { range } : {}),
    },
  } as Request;
}

describe('MediaController', () => {
  function createController() {
    const mediaService = {
      getFile: jest.fn(),
      getFileMetadata: jest.fn(),
      getFileRange: jest.fn(),
    };
    const authService = {
      getCurrentUser: jest.fn().mockResolvedValue({ id: 1 }),
    };
    const controller = new MediaController(
      mediaService as never,
      authService as never,
    );

    return { authService, controller, mediaService };
  }

  it('allows browser media tags to embed full file responses cross-origin', async () => {
    const { controller, mediaService } = createController();
    const response = createResponseMock();
    const stream = createStreamMock();

    mediaService.getFileMetadata.mockResolvedValue({
      mimeType: 'image/jpeg',
      size: 123,
    });
    mediaService.getFile.mockResolvedValue({
      mimeType: 'image/jpeg',
      size: 123,
      stream,
    });

    await controller.getFile(
      'suppliers/products/photo.jpg',
      undefined,
      createRequest(),
      response,
    );

    expect(response.setHeader).toHaveBeenCalledWith(
      'Cross-Origin-Resource-Policy',
      'cross-origin',
    );
    expect(response.setHeader).toHaveBeenCalledWith('Content-Length', '123');
    expect(stream.pipe).toHaveBeenCalledWith(response);
  });

  it('allows browser media tags to embed ranged file responses cross-origin', async () => {
    const { controller, mediaService } = createController();
    const response = createResponseMock();
    const stream = createStreamMock();

    mediaService.getFileMetadata.mockResolvedValue({
      mimeType: 'video/mp4',
      size: 100,
    });
    mediaService.getFileRange.mockResolvedValue({
      mimeType: 'video/mp4',
      size: 100,
      stream,
    });

    await controller.getFile(
      'training/video.mp4',
      undefined,
      createRequest('bytes=10-19'),
      response,
    );

    expect(response.status).toHaveBeenCalledWith(206);
    expect(response.setHeader).toHaveBeenCalledWith(
      'Cross-Origin-Resource-Policy',
      'cross-origin',
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Range',
      'bytes 10-19/100',
    );
    expect(response.setHeader).toHaveBeenCalledWith('Content-Length', '10');
    expect(stream.pipe).toHaveBeenCalledWith(response);
  });
});
