import { Injectable, Logger } from '@nestjs/common';
import { MediaService } from '../../media/media.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ExamBankConfigService } from '../config/exam-bank-config.service';
import { KNOWLEDGE_MIME_TYPES } from '../exam-bank.constants';
import { packVector } from '../embeddings/vector-codec';
import { VoyageClient } from '../embeddings/voyage.client';
import { claimRow, releaseRow } from '../worker/row-lock';
import { MAX_OCR_PDF_BYTES, PdfOcrClient } from './pdf-ocr.client';
import { chunkText, detectLanguage, normalizeText } from './text-chunker';
import {
  MAX_EXTRACTED_CHARS,
  MIN_TRANSCRIBED_CHARS,
  NoExtractableTextError,
  assertHasText,
  extractText,
  streamToBuffer,
  type ExtractedText,
  type SourceKind,
} from './text-extraction';

const CHUNK_INSERT_BATCH = 200;

type MaterialRow = {
  id: number;
  objectKey: string;
  mimeType: string;
  title: string;
};

/**
 * Turns an uploaded knowledge material into embedded chunks:
 * download → extract text → chunk → embed (Voyage) → persist.
 * Driven by the exam worker, one material per tick.
 */
@Injectable()
export class KnowledgeIngestionService {
  private readonly logger = new Logger(KnowledgeIngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
    private readonly voyage: VoyageClient,
    private readonly config: ExamBankConfigService,
    private readonly ocr: PdfOcrClient,
  ) {}

  /**
   * Processes the oldest PENDING material, or one left PROCESSING by a crash
   * (its lock expired). Returns true when work was done.
   */
  async processNextPending(): Promise<boolean> {
    if (!this.config.isEmbeddingConfigured) {
      return false;
    }
    const material = await this.prisma.examKnowledgeMaterial.findFirst({
      where: {
        OR: [
          { status: 'PENDING' },
          { status: 'PROCESSING', lockedUntil: { lt: new Date() } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, objectKey: true, mimeType: true, title: true },
    });
    if (
      !material ||
      !(await claimRow(this.prisma.examKnowledgeMaterial, material.id))
    ) {
      return false;
    }
    try {
      await this.ingest(material);
    } finally {
      await releaseRow(this.prisma.examKnowledgeMaterial, material.id);
    }
    return true;
  }

  private async ingest(material: MaterialRow): Promise<void> {
    await this.setStatus(material.id, 'PROCESSING', null);
    try {
      const kind = KNOWLEDGE_MIME_TYPES[material.mimeType] ?? 'txt';
      const file = await this.mediaService.getFile(material.objectKey);
      const { text } = await this.extract(
        material,
        await streamToBuffer(file.stream),
        kind,
      );
      const chunks = chunkText(text);
      const vectors = await this.voyage.embed(chunks.map((c) => c.content));

      await this.prisma.$transaction(async (tx) => {
        await tx.examKnowledgeChunk.deleteMany({
          where: { materialId: material.id },
        });
        for (let i = 0; i < chunks.length; i += CHUNK_INSERT_BATCH) {
          await tx.examKnowledgeChunk.createMany({
            data: chunks.slice(i, i + CHUNK_INSERT_BATCH).map((chunk, j) => ({
              materialId: material.id,
              ordinal: i + j,
              content: chunk.content,
              tokenEstimate: chunk.tokenEstimate,
              embedding: packVector(vectors[i + j]),
              embeddingModel: this.voyage.model,
            })),
          });
        }
        await tx.examKnowledgeMaterial.update({
          where: { id: material.id },
          data: {
            status: 'READY',
            errorCode: null,
            language: detectLanguage(text),
            charCount: text.length,
            chunkCount: chunks.length,
          },
        });
      });
      this.logger.log(
        `Knowledge material #${material.id} ready with ${chunks.length} chunks.`,
      );
    } catch (error) {
      await this.handleFailure(material, error);
    }
  }

  /** Image-only PDFs (scans, exported cards) are read by Claude instead. */
  private async extract(
    material: MaterialRow,
    buffer: Buffer,
    kind: SourceKind,
  ): Promise<ExtractedText> {
    try {
      return await extractText(buffer, kind);
    } catch (error) {
      const canOcr =
        error instanceof NoExtractableTextError &&
        kind === 'pdf' &&
        this.ocr.isAvailable &&
        buffer.length <= MAX_OCR_PDF_BYTES;
      if (!canOcr) throw error;
      this.logger.log(
        `Knowledge material #${material.id} has no text layer; transcribing with Claude.`,
      );
      const text = normalizeText(await this.ocr.transcribe(buffer)).slice(
        0,
        MAX_EXTRACTED_CHARS,
      );
      const extracted = { text, pageCount: null };
      assertHasText(extracted, MIN_TRANSCRIBED_CHARS);
      return extracted;
    }
  }

  private async handleFailure(
    material: MaterialRow,
    error: unknown,
  ): Promise<void> {
    const errorCode =
      error instanceof NoExtractableTextError
        ? 'KB_MATERIAL_NO_TEXT'
        : 'KB_INGESTION_FAILED';
    this.logger.error(
      `Knowledge material #${material.id} ingestion failed: ${(error as Error).message}`,
    );
    await this.setStatus(material.id, 'FAILED', errorCode);
  }

  private async setStatus(
    id: number,
    status: string,
    errorCode: string | null,
  ): Promise<void> {
    await this.prisma.examKnowledgeMaterial.update({
      where: { id },
      data: { status, errorCode },
    });
  }
}
