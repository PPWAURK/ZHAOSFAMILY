import {
  BadRequestException,
  ConflictException,
  PayloadTooLargeException,
} from '@nestjs/common';
import {
  KnowledgeMaterialsService,
  resolveKnowledgeMimeType,
  titleFromFileName,
} from './knowledge-materials.service';
import { partial } from '../spec-helpers.testspec';

const NOW = new Date('2026-11-18T10:00:00Z');

function materialRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: 'Hygiène',
    description: null,
    bucket: 'b',
    objectKey: 'exam-knowledge/2026/11/x.pdf',
    originalName: 'x.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 10,
    language: null,
    status: 'READY',
    errorCode: null,
    charCount: 0,
    chunkCount: 0,
    lockedUntil: null,
    uploadedByUserId: 1,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function buildService() {
  const prisma = {
    examKnowledgeMaterial: {
      create: jest.fn().mockResolvedValue(materialRow({ status: 'PENDING' })),
      findUnique: jest.fn().mockResolvedValue(materialRow()),
      update: jest.fn().mockResolvedValue(materialRow({ status: 'PENDING' })),
      delete: jest.fn(),
    },
    examGenerationJob: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const media = {
    upload: jest.fn().mockResolvedValue({
      bucket: 'b',
      objectKey: 'exam-knowledge/2026/11/x.pdf',
      originalName: 'x.pdf',
    }),
    deleteFile: jest.fn().mockResolvedValue(undefined),
  };
  const config = { maxUploadBytes: 1000 };
  const service = new KnowledgeMaterialsService(
    prisma as never,
    media as never,
    config as never,
  );
  return { service, prisma, media };
}

const file = (overrides: Partial<Express.Multer.File> = {}) =>
  ({
    mimetype: 'application/pdf',
    originalname: 'x.pdf',
    size: 10,
    buffer: Buffer.from('x'),
    ...overrides,
  }) as Express.Multer.File;

describe('resolveKnowledgeMimeType', () => {
  it('accepts known mime types and falls back to the extension', () => {
    expect(resolveKnowledgeMimeType(file())).toBe('application/pdf');
    expect(
      resolveKnowledgeMimeType(
        file({ mimetype: 'application/octet-stream', originalname: 'a.DOCX' }),
      ),
    ).toContain('wordprocessingml');
    expect(
      resolveKnowledgeMimeType(
        file({ mimetype: 'image/png', originalname: 'a.png' }),
      ),
    ).toBeNull();
  });
});

describe('KnowledgeMaterialsService', () => {
  it('uploads to the exam-knowledge folder and creates a PENDING row', async () => {
    const { service, prisma, media } = buildService();
    const view = await service.create(file(), { title: '  Hygiène ' }, 9);

    expect(media.upload).toHaveBeenCalledWith(expect.anything(), {
      folder: 'exam-knowledge',
    });
    expect(prisma.examKnowledgeMaterial.create).toHaveBeenCalledWith({
      data: partial({ title: 'Hygiène', uploadedByUserId: 9 }),
    });
    expect(view.status).toBe('PENDING');
    expect(view).not.toHaveProperty('objectKey');
  });

  it('names the material after the uploaded file when no title is given', async () => {
    const { service, prisma, media } = buildService();
    media.upload.mockResolvedValue({
      bucket: 'b',
      objectKey: 'exam-knowledge/2026/11/y.docx',
      originalName: '红线与黑线制度.docx',
    });

    await service.create(file(), { title: '   ' }, 9);

    expect(prisma.examKnowledgeMaterial.create).toHaveBeenCalledWith({
      data: partial({ title: '红线与黑线制度' }),
    });
  });

  it('rejects missing, oversized and unsupported files', async () => {
    const { service } = buildService();
    await expect(
      service.create(undefined, { title: 't' }, 1),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create(file({ size: 5000 }), { title: 't' }, 1),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
    await expect(
      service.create(
        file({ mimetype: 'image/png', originalname: 'a.png' }),
        { title: 't' },
        1,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses to requeue a material that is queued or being processed', async () => {
    const { service, prisma } = buildService();
    prisma.examKnowledgeMaterial.findUnique.mockResolvedValue(
      materialRow({
        status: 'PROCESSING',
        lockedUntil: new Date(Date.now() + 60_000),
      }),
    );
    await expect(service.reprocess(1)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('requeues a material left PROCESSING by a crash (lock expired)', async () => {
    const { service, prisma } = buildService();
    prisma.examKnowledgeMaterial.findUnique.mockResolvedValue(
      materialRow({
        status: 'PROCESSING',
        lockedUntil: new Date(Date.now() - 60_000),
      }),
    );
    await service.reprocess(1);
    expect(prisma.examKnowledgeMaterial.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: 'PENDING', errorCode: null },
    });
  });

  it('refuses to re-chunk a material used by an active generation job', async () => {
    const { service, prisma } = buildService();
    prisma.examGenerationJob.findMany.mockResolvedValue([{ materialIds: [1] }]);
    await expect(service.reprocess(1)).rejects.toThrow('KB_MATERIAL_IN_USE');
  });

  it('blocks deletion while an active generation job uses the material', async () => {
    const { service, prisma } = buildService();
    prisma.examGenerationJob.findMany.mockResolvedValue([
      { materialIds: [1, 2] },
    ]);
    await expect(service.remove(1)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.examKnowledgeMaterial.delete).not.toHaveBeenCalled();
  });

  it('deletes the row and the stored file', async () => {
    const { service, prisma, media } = buildService();
    await service.remove(1);
    expect(prisma.examKnowledgeMaterial.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
    expect(media.deleteFile).toHaveBeenCalledWith(
      'exam-knowledge/2026/11/x.pdf',
    );
  });
});

describe('titleFromFileName', () => {
  it('drops only the last extension', () => {
    expect(titleFromFileName('店长科目一 v2.final.docx')).toBe(
      '店长科目一 v2.final',
    );
    expect(titleFromFileName('README')).toBe('README');
    expect(titleFromFileName('.pdf')).toBe('.pdf');
  });
});
