import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
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
import { AuthService } from '../auth/auth.service';
import { parseBearerToken } from '../auth/auth-token.utils';
import { Public } from '../auth/decorators/public.decorator';
import { SignMediaQueryDto } from './dto/sign-media.dto';

const MEDIA_UPLOAD_MAX_BYTES = 5 * 1024 * 1024 * 1024;
const MEDIA_SIGNED_URL_TTL_SECONDS = 60 * 60 * 4;
const MEDIA_UPLOAD_TEMP_DIR = path.join(tmpdir(), 'zhao-media-uploads');

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'video/mp4',
  'video/quicktime',
  'audio/mpeg',
  'audio/mp4',
]);

mkdirSync(MEDIA_UPLOAD_TEMP_DIR, { recursive: true });

type ParsedRange = {
  start: number;
  end: number;
};

type MediaFileResponseHeaders = {
  contentLength: number;
  contentRange?: string;
  contentType: string;
};

function setMediaFileResponseHeaders(
  response: Response,
  headers: MediaFileResponseHeaders,
): void {
  response.setHeader('Content-Type', headers.contentType);
  response.setHeader('Accept-Ranges', 'bytes');
  response.setHeader('Content-Length', headers.contentLength.toString());
  response.setHeader('Content-Disposition', 'inline');
  response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  if (headers.contentRange) {
    response.setHeader('Content-Range', headers.contentRange);
  }
}

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
  constructor(
    private readonly mediaService: MediaService,
    private readonly authService: AuthService,
  ) {}

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
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
          callback(new BadRequestException('FILE_TYPE_NOT_ALLOWED'), false);
          return;
        }
        callback(null, true);
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

  // Issues a short-lived presigned URL so the browser can load the object
  // directly from the bucket (R2) without our session token ever entering the
  // URL. Authenticated via the global AuthGuard (NOT @Public); the caller must
  // hold a valid session to obtain a signature.
  @Get('sign')
  async signFile(
    @Query() query: SignMediaQueryDto,
  ): Promise<{ url: string; expiresAt: string }> {
    const url = await this.mediaService.getSignedUrl(
      query.objectKey,
      MEDIA_SIGNED_URL_TTL_SECONDS,
    );

    return {
      url,
      expiresAt: new Date(
        Date.now() + MEDIA_SIGNED_URL_TTL_SECONDS * 1000,
      ).toISOString(),
    };
  }

  // Deprecated: legacy path that streams through this server and accepts the
  // session token as a `?token=` query param. Superseded by GET /media/sign
  // (presigned direct-to-bucket). Kept for one release for backward compat.
  // Public so browsers can load <img>/<video> src URLs directly (no header
  // support there). Authentication is still mandatory: accepts a Bearer
  // header for API/server callers, or a `?token=` query param fallback for
  // markup-driven loads, both validated against the real session below.
  @Public()
  @Get('file')
  async getFile(
    @Query('objectKey') objectKey: string | undefined,
    @Query('token') tokenParam: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    if (!objectKey) {
      throw new BadRequestException('OBJECT_KEY_IS_REQUIRED');
    }

    const accessToken =
      parseBearerToken(request.headers.authorization) ?? tokenParam;

    if (!accessToken) {
      throw new UnauthorizedException('ACCESS_TOKEN_REQUIRED');
    }

    await this.authService.getCurrentUser(accessToken);

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
      setMediaFileResponseHeaders(response, {
        contentType: file.mimeType,
        contentLength: chunkSize,
        contentRange: `bytes ${range.start}-${range.end}/${file.size}`,
      });

      file.stream.pipe(response);
      return;
    }

    const file = await this.mediaService.getFile(objectKey);

    setMediaFileResponseHeaders(response, {
      contentType: file.mimeType,
      contentLength: file.size,
    });

    file.stream.pipe(response);
  }
}
