import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import multer from 'multer';
import { tmpdir } from 'os';
import * as path from 'path';
import type { Request, Response } from 'express';
import { MediaService, type UploadedMedia } from './media.service';

const MEDIA_UPLOAD_MAX_BYTES = 5 * 1024 * 1024 * 1024;
const MEDIA_UPLOAD_TEMP_DIR = path.join(tmpdir(), 'zhao-media-uploads');

mkdirSync(MEDIA_UPLOAD_TEMP_DIR, { recursive: true });

type ParsedRange = {
  start: number;
  end: number;
};

function parseRangeHeader(
  rangeHeader: string | undefined,
  fileSize: number,
): ParsedRange | null {
  if (!rangeHeader?.startsWith('bytes=')) {
    return null;
  }

  const [startPart, endPart] = rangeHeader.replace('bytes=', '').split('-');
  const start = Number(startPart);
  const requestedEnd = endPart ? Number(endPart) : fileSize - 1;

  if (
    !Number.isInteger(start) ||
    !Number.isInteger(requestedEnd) ||
    start < 0 ||
    requestedEnd < start ||
    start >= fileSize
  ) {
    return null;
  }

  return {
    start,
    end: Math.min(requestedEnd, fileSize - 1),
  };
}

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.diskStorage({
        destination: MEDIA_UPLOAD_TEMP_DIR,
        filename: (_req, file, callback) => {
          const ext = path.extname(file.originalname || '');
          callback(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: {
        fileSize: MEDIA_UPLOAD_MAX_BYTES,
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ): Promise<UploadedMedia> {
    if (!file) {
      throw new BadRequestException('FILE_IS_REQUIRED');
    }

    return this.mediaService.upload(file, { folder });
  }

  @Get('file')
  async getFile(
    @Query('objectKey') objectKey: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    if (!objectKey) {
      throw new BadRequestException('OBJECT_KEY_IS_REQUIRED');
    }

    const metadata = await this.mediaService.getFileMetadata(objectKey);
    const range = parseRangeHeader(request.headers.range, metadata.size);

    if (request.headers.range && !range) {
      response.status(416);
      response.setHeader('Content-Range', `bytes */${metadata.size}`);
      response.end();
      return;
    }

    if (range) {
      const file = await this.mediaService.getFileRange(
        objectKey,
        range.start,
        range.end,
      );
      const chunkSize = range.end - range.start + 1;

      response.status(206);
      response.setHeader('Content-Type', file.mimeType);
      response.setHeader('Accept-Ranges', 'bytes');
      response.setHeader('Content-Length', chunkSize.toString());
      response.setHeader(
        'Content-Range',
        `bytes ${range.start}-${range.end}/${file.size}`,
      );
      response.setHeader('Content-Disposition', 'inline');

      file.stream.pipe(response);
      return;
    }

    const file = await this.mediaService.getFile(objectKey);

    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Accept-Ranges', 'bytes');
    response.setHeader('Content-Length', file.size.toString());
    response.setHeader('Content-Disposition', 'inline');

    file.stream.pipe(response);
  }
}
