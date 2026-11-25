import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ExamBankConfigService } from '../config/exam-bank-config.service';
import { packVector, unpackVector } from '../embeddings/vector-codec';
import { VoyageClient } from '../embeddings/voyage.client';
import {
  dedupCandidates,
  type DedupContext,
  type DedupOutcome,
} from './question-dedup';
import { normalizePromptText } from './question-rules';

const BACKFILL_BATCH = 128;

@Injectable()
export class QuestionDedupService {
  private readonly logger = new Logger(QuestionDedupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly voyage: VoyageClient,
    private readonly config: ExamBankConfigService,
  ) {}

  get embeddingModel(): string {
    return this.voyage.model;
  }

  /** Every question of the bank, rejected ones included, so rejected ideas do not come back. */
  async loadContext(): Promise<DedupContext> {
    const rows = await this.prisma.examQuestion.findMany({
      select: { promptZh: true, promptEmbedding: true },
    });
    return {
      texts: new Set(rows.map((r) => normalizePromptText(r.promptZh))),
      vectors: rows.flatMap((r) =>
        r.promptEmbedding ? [unpackVector(r.promptEmbedding)] : [],
      ),
    };
  }

  async filter<T extends { promptZh: string }>(
    candidates: readonly T[],
    context: DedupContext,
  ): Promise<DedupOutcome<T>> {
    const vectors = await this.embedOrNull(candidates.map((c) => c.promptZh));
    return dedupCandidates(candidates, vectors, context);
  }

  /** Embeds prompts of questions that have none yet (manual or edited ones). */
  async backfillMissingEmbeddings(): Promise<boolean> {
    if (!this.config.isEmbeddingConfigured) return false;
    const rows = await this.prisma.examQuestion.findMany({
      where: { promptEmbedding: null },
      select: { id: true, promptZh: true },
      take: BACKFILL_BATCH,
    });
    if (!rows.length) return false;
    const vectors = await this.voyage.embed(rows.map((r) => r.promptZh));
    await this.prisma.$transaction(
      rows.map((row, i) =>
        this.prisma.examQuestion.update({
          where: { id: row.id },
          data: {
            promptEmbedding: packVector(vectors[i]),
            embeddingModel: this.voyage.model,
          },
        }),
      ),
    );
    return true;
  }

  /** Voyage outages must not fail a whole batch: fall back to exact-text dedup. */
  private async embedOrNull(
    texts: string[],
  ): Promise<Array<Float32Array | null>> {
    if (!texts.length || !this.config.isEmbeddingConfigured)
      return texts.map(() => null);
    try {
      return await this.voyage.embed(texts);
    } catch (error) {
      this.logger.warn(
        `Question embedding failed, text-only dedup: ${(error as Error).message}`,
      );
      return texts.map(() => null);
    }
  }
}
