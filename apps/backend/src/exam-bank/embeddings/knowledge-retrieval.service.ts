import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { IndexedChunk } from './knowledge-retrieval';
import { unpackVector } from './vector-codec';

@Injectable()
export class KnowledgeRetrievalService {
  constructor(private readonly prisma: PrismaService) {}

  /** Loads every chunk (text + vector) of the given materials into memory. */
  async loadIndex(materialIds: readonly number[]): Promise<IndexedChunk[]> {
    const rows = await this.prisma.examKnowledgeChunk.findMany({
      where: { materialId: { in: [...materialIds] } },
      orderBy: [{ materialId: 'asc' }, { ordinal: 'asc' }],
      select: {
        id: true,
        materialId: true,
        ordinal: true,
        content: true,
        tokenEstimate: true,
        embedding: true,
      },
    });
    return rows.map(({ embedding, ...chunk }) => ({
      ...chunk,
      vector: embedding ? unpackVector(embedding) : null,
    }));
  }
}
