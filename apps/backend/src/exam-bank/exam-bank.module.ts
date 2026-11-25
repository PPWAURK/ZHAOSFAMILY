import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ExamAttemptExpiryService } from './attempts/exam-attempt-expiry.service';
import { ExamAttemptGraderService } from './attempts/exam-attempt-grader.service';
import { ExamAttemptProgressService } from './attempts/exam-attempt-progress.service';
import { ExamBlueprintService } from './blueprint/exam-blueprint.service';
import { ExamAttemptStarterService } from './attempts/exam-attempt-starter.service';
import { ExamAttemptsService } from './attempts/exam-attempts.service';
import { ExamCatalogService } from './attempts/exam-catalog.service';
import { ExamsController } from './attempts/exams.controller';
import { ExamBankConfigService } from './config/exam-bank-config.service';
import { KnowledgeRetrievalService } from './embeddings/knowledge-retrieval.service';
import { VoyageClient } from './embeddings/voyage.client';
import { ClaudeBatchClient } from './generation/claude-batch.client';
import { GenerationBatchRunnerService } from './generation/generation-batch-runner.service';
import { GenerationIngesterService } from './generation/generation-ingester.service';
import { GenerationJobsController } from './generation/generation-jobs.controller';
import { GenerationJobsService } from './generation/generation-jobs.service';
import { GenerationPlanningService } from './generation/generation-planning.service';
import { GenerationSubmitterService } from './generation/generation-submitter.service';
import { KnowledgeIngestionService } from './knowledge/knowledge-ingestion.service';
import { PdfOcrClient } from './knowledge/pdf-ocr.client';
import { KnowledgeMaterialsController } from './knowledge/knowledge-materials.controller';
import { KnowledgeMaterialsService } from './knowledge/knowledge-materials.service';
import { ExamCategoriesController } from './questions/exam-categories.controller';
import { ExamCategoriesService } from './questions/exam-categories.service';
import { QuestionDedupService } from './questions/question-dedup.service';
import { QuestionReviewController } from './questions/question-review.controller';
import { QuestionReviewService } from './questions/question-review.service';
import { ExamResultsController } from './results/exam-results.controller';
import { ExamResultsService } from './results/exam-results.service';
import { ExamSessionCloserService } from './sessions/exam-session-closer.service';
import { ExamSessionJoinService } from './sessions/exam-session-join.service';
import { ExamSessionsController } from './sessions/exam-sessions.controller';
import { ExamSessionsService } from './sessions/exam-sessions.service';
import { ExamTemplatesController } from './templates/exam-templates.controller';
import { ExamTemplatesService } from './templates/exam-templates.service';
import { ExamWorkerService } from './worker/exam-worker.service';

@Module({
  imports: [AuthModule, MediaModule, PrismaModule],
  controllers: [
    KnowledgeMaterialsController,
    GenerationJobsController,
    QuestionReviewController,
    ExamCategoriesController,
    ExamTemplatesController,
    ExamResultsController,
    ExamsController,
    ExamSessionsController,
  ],
  providers: [
    ExamBankConfigService,
    VoyageClient,
    ClaudeBatchClient,
    KnowledgeMaterialsService,
    KnowledgeIngestionService,
    PdfOcrClient,
    KnowledgeRetrievalService,
    GenerationPlanningService,
    GenerationSubmitterService,
    GenerationIngesterService,
    GenerationBatchRunnerService,
    GenerationJobsService,
    QuestionDedupService,
    QuestionReviewService,
    ExamCategoriesService,
    ExamTemplatesService,
    ExamAttemptGraderService,
    ExamAttemptProgressService,
    ExamBlueprintService,
    ExamAttemptStarterService,
    ExamSessionCloserService,
    ExamSessionsService,
    ExamSessionJoinService,
    ExamAttemptsService,
    ExamAttemptExpiryService,
    ExamCatalogService,
    ExamResultsService,
    ExamWorkerService,
  ],
})
export class ExamBankModule {}
