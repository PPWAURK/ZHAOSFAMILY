import { Readable } from 'stream';
import { KnowledgeIngestionService } from './knowledge-ingestion.service';
import { NoExtractableTextError, extractText } from './text-extraction';
import { callArg, partial } from '../spec-helpers.testspec';

jest.mock('./text-extraction', () => {
  const actual =
    jest.requireActual<typeof import('./text-extraction')>('./text-extraction');
  return { ...actual, extractText: jest.fn() };
});

const extractTextMock = extractText as jest.MockedFunction<typeof extractText>;

function buildService(
  overrides: { isEmbeddingConfigured?: boolean; isOcrAvailable?: boolean } = {},
) {
  const tx = {
    examKnowledgeChunk: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    examKnowledgeMaterial: { update: jest.fn() },
  };
  const prisma = {
    examKnowledgeMaterial: {
      findFirst: jest.fn().mockResolvedValue({
        id: 4,
        objectKey: 'exam-knowledge/a.pdf',
        mimeType: 'application/pdf',
        title: 'Hygiène',
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn(),
    },
    $transaction: jest.fn((fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  const media = {
    getFile: jest.fn().mockResolvedValue({ stream: Readable.from(['pdf']) }),
  };
  const voyage = {
    model: 'voyage-4',
    embed: jest.fn((inputs: string[]) =>
      Promise.resolve(inputs.map(() => Float32Array.from([1, 0]))),
    ),
  };
  const config = {
    isEmbeddingConfigured: overrides.isEmbeddingConfigured ?? true,
  };
  const ocr = {
    isAvailable: overrides.isOcrAvailable ?? false,
    // A short reference table: few letters, mostly numbers and units.
    transcribe: jest
      .fn()
      .mockResolvedValue(
        '| 海带丝 | 常温 1H 烫 2min |\n| 木耳 | 常温 1H 烫 1min |\n| 香菇 | 常温 2H |\n| 上海青 | 5 秒 |\n| 豆芽 | 30 秒 |\n| 米线 | 常温 3H 换水 |',
      ),
  };
  const service = new KnowledgeIngestionService(
    prisma as never,
    media as never,
    voyage as never,
    config as never,
    ocr as never,
  );
  return { service, prisma, tx, voyage, ocr };
}

describe('KnowledgeIngestionService', () => {
  beforeEach(() => extractTextMock.mockReset());

  it('does nothing when Voyage is not configured', async () => {
    const { service, prisma } = buildService({ isEmbeddingConfigured: false });
    await expect(service.processNextPending()).resolves.toBe(false);
    expect(prisma.examKnowledgeMaterial.findFirst).not.toHaveBeenCalled();
  });

  it('also resumes materials left PROCESSING by a crash', async () => {
    const { service, prisma } = buildService();
    prisma.examKnowledgeMaterial.findFirst.mockResolvedValueOnce(null);
    await service.processNextPending();
    const { where } = callArg<{ where: { OR: unknown[] } }>(
      prisma.examKnowledgeMaterial.findFirst,
    );
    expect(where.OR).toEqual([
      { status: 'PENDING' },
      {
        status: 'PROCESSING',
        lockedUntil: { lt: expect.any(Date) as unknown },
      },
    ]);
  });

  it('skips a material locked by another worker', async () => {
    const { service, prisma } = buildService();
    prisma.examKnowledgeMaterial.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.processNextPending()).resolves.toBe(false);
    expect(extractTextMock).not.toHaveBeenCalled();
  });

  it('chunks, embeds and stores the material, then marks it READY', async () => {
    extractTextMock.mockResolvedValue({
      text: '员工上岗前必须洗手。'.repeat(30),
      pageCount: 1,
    });
    const { service, tx, voyage } = buildService();

    await expect(service.processNextPending()).resolves.toBe(true);

    expect(voyage.embed).toHaveBeenCalledTimes(1);
    expect(tx.examKnowledgeChunk.deleteMany).toHaveBeenCalledWith({
      where: { materialId: 4 },
    });
    const rows = callArg<{ data: unknown[] }>(
      tx.examKnowledgeChunk.createMany,
    ).data;
    expect(rows[0]).toEqual(
      expect.objectContaining({
        materialId: 4,
        ordinal: 0,
        embeddingModel: 'voyage-4',
      }),
    );
    expect(tx.examKnowledgeMaterial.update).toHaveBeenCalledWith({
      where: { id: 4 },
      data: partial({
        status: 'READY',
        language: 'zh',
        chunkCount: rows.length,
      }),
    });
  });

  it('marks scanned documents as FAILED with KB_MATERIAL_NO_TEXT', async () => {
    extractTextMock.mockRejectedValue(new NoExtractableTextError());
    const { service, prisma } = buildService();

    await service.processNextPending();

    expect(prisma.examKnowledgeMaterial.update).toHaveBeenLastCalledWith({
      where: { id: 4 },
      data: { status: 'FAILED', errorCode: 'KB_MATERIAL_NO_TEXT' },
    });
    expect(prisma.examKnowledgeMaterial.updateMany).toHaveBeenLastCalledWith({
      where: { id: 4 },
      data: { lockedUntil: null },
    });
  });

  it('transcribes an image-only PDF with Claude and stores its text', async () => {
    extractTextMock.mockRejectedValue(new NoExtractableTextError());
    const { service, tx, ocr } = buildService({ isOcrAvailable: true });

    await service.processNextPending();

    expect(ocr.transcribe).toHaveBeenCalledWith(expect.any(Buffer));
    expect(tx.examKnowledgeMaterial.update).toHaveBeenCalledWith({
      where: { id: 4 },
      data: partial({ status: 'READY', errorCode: null }),
    });
  });

  it('still fails when the transcription has no real text', async () => {
    extractTextMock.mockRejectedValue(new NoExtractableTextError());
    const { service, prisma, ocr } = buildService({ isOcrAvailable: true });
    ocr.transcribe.mockResolvedValue(
      '0.3.2 叫货数量表\n详情见《叫货数量表》文件。',
    );

    await service.processNextPending();

    expect(prisma.examKnowledgeMaterial.update).toHaveBeenLastCalledWith({
      where: { id: 4 },
      data: { status: 'FAILED', errorCode: 'KB_MATERIAL_NO_TEXT' },
    });
  });

  it('never sends non-PDF files to Claude', async () => {
    extractTextMock.mockRejectedValue(new NoExtractableTextError());
    const { service, prisma, ocr } = buildService({ isOcrAvailable: true });
    prisma.examKnowledgeMaterial.findFirst.mockResolvedValue({
      id: 4,
      objectKey: 'exam-knowledge/a.docx',
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      title: 'Hygiène',
    });

    await service.processNextPending();

    expect(ocr.transcribe).not.toHaveBeenCalled();
  });
});
