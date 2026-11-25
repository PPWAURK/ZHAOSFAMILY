import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ExamAttemptExpiryService } from '../attempts/exam-attempt-expiry.service';
import { ExamSessionCloserService } from '../sessions/exam-session-closer.service';
import { ExamBankConfigService } from '../config/exam-bank-config.service';
import { GenerationBatchRunnerService } from '../generation/generation-batch-runner.service';
import { KnowledgeIngestionService } from '../knowledge/knowledge-ingestion.service';
import { QuestionDedupService } from '../questions/question-dedup.service';

type WorkerTask = { name: string; run: () => Promise<unknown> };

/**
 * In-process background loop for the exam bank (single-instance deployment,
 * same pattern as AuthService's permission sweeper). Every tick runs each task
 * once; rows are claimed with a lockedUntil column, so a restart resumes from
 * the state persisted in the database and a second instance would not collide.
 */
@Injectable()
export class ExamWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExamWorkerService.name);
  private timer?: ReturnType<typeof setInterval>;
  private isTicking = false;

  constructor(
    private readonly config: ExamBankConfigService,
    private readonly ingestion: KnowledgeIngestionService,
    private readonly generation: GenerationBatchRunnerService,
    private readonly dedup: QuestionDedupService,
    private readonly expiry: ExamAttemptExpiryService,
    private readonly sessions: ExamSessionCloserService,
  ) {}

  onModuleInit(): void {
    if (!this.config.isWorkerEnabled) {
      this.logger.log('Exam worker disabled (EXAM_WORKER_ENABLED=false).');
      return;
    }
    this.timer = setInterval(
      () => void this.tick(),
      this.config.workerIntervalMs,
    );
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  protected tasks(): WorkerTask[] {
    return [
      {
        name: 'knowledge-ingestion',
        run: () => this.ingestion.processNextPending(),
      },
      {
        name: 'generation-jobs',
        run: () => this.generation.advanceActiveJobs(),
      },
      {
        name: 'question-embeddings',
        run: () => this.dedup.backfillMissingEmbeddings(),
      },
      { name: 'attempt-expiry', run: () => this.expiry.expireOverdue() },
      { name: 'session-closing', run: () => this.sessions.closeExpired() },
    ];
  }

  /** Runs every task once; overlapping ticks are skipped. */
  async tick(): Promise<void> {
    if (this.isTicking) {
      return;
    }
    this.isTicking = true;
    try {
      for (const task of this.tasks()) {
        await task
          .run()
          .catch((error: Error) =>
            this.logger.error(
              `Exam worker task ${task.name} failed: ${error.message}`,
            ),
          );
      }
    } finally {
      this.isTicking = false;
    }
  }
}
