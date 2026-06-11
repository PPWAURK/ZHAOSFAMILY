import type {
  TrainingMaterialProgress,
  TrainingPlan,
  TrainingPlanMaterial,
} from "@/features/training/trainingTypes";
import type { ViewerMessage } from "@/features/training/trainingViewer";

export type ImageViewerStats = {
  kind: "image";
  viewedSeconds: number;
};

export type ViewerStats = ViewerMessage | ImageViewerStats;

export type CompletionAssessment = {
  canMarkComplete: boolean;
  shouldAutoComplete: boolean;
  progressPct: number;
};

// A video counts as watched once 90% of its duration was actually played.
export const VIDEO_COMPLETION_WATCHED_PCT = 90;

// An image only needs a short dwell before the employee can confirm it.
export const IMAGE_MIN_VIEW_SECONDS = 5;

// A PDF needs the last page reached plus a minimum reading time so that
// fast-scrolling to the end does not count as "read".
export function pdfMinReadSeconds(numPages: number): number {
  return Math.min(10 + numPages * 3, 120);
}

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;

  return Math.max(0, Math.min(100, Math.round(value)));
}

export function assessViewerStats(stats: ViewerStats): CompletionAssessment {
  if (stats.kind === "video") {
    const watched =
      stats.ended || stats.watchedPct >= VIDEO_COMPLETION_WATCHED_PCT;

    return {
      canMarkComplete: watched,
      shouldAutoComplete: watched,
      progressPct: clampPct(stats.positionPct),
    };
  }

  if (stats.kind === "pdf") {
    const reachedLastPage = stats.numPages > 0 && stats.maxPage >= stats.numPages;
    const readLongEnough = stats.readSeconds >= pdfMinReadSeconds(stats.numPages);

    return {
      // Reaching the last page is enough for the employee to confirm manually
      // (the confirmation dialog guards against accidental taps); the reading
      // time gate only applies to silent auto-completion.
      canMarkComplete: reachedLastPage,
      shouldAutoComplete: reachedLastPage && readLongEnough,
      progressPct:
        stats.numPages > 0 ? clampPct((stats.maxPage / stats.numPages) * 100) : 0,
    };
  }

  const viewedLongEnough = stats.viewedSeconds >= IMAGE_MIN_VIEW_SECONDS;

  return {
    canMarkComplete: viewedLongEnough,
    shouldAutoComplete: false,
    progressPct: viewedLongEnough ? 100 : 0,
  };
}

function calculateCompletionPercent(total: number, completed: number): number {
  if (total === 0) return 100;

  return Math.round((completed / total) * 100);
}

// Mirrors the backend summary so the screen stays consistent without a full
// plan reload after each progress update.
export function applyMaterialProgress(
  plan: TrainingPlan,
  materialId: number,
  progress: TrainingMaterialProgress,
): TrainingPlan {
  const applyToList = (
    materials: TrainingPlanMaterial[],
  ): TrainingPlanMaterial[] =>
    materials.map((material) =>
      material.id === materialId
        ? { ...material, progress: { ...progress, materialId } }
        : material,
    );

  const required = applyToList(plan.required);
  const optional = applyToList(plan.optional);
  const requiredCompleted = required.filter(
    (material) => material.progress.status === "completed",
  ).length;

  return {
    ...plan,
    required,
    optional,
    summary: {
      requiredTotal: required.length,
      requiredCompleted,
      completionPercent: calculateCompletionPercent(
        required.length,
        requiredCompleted,
      ),
    },
  };
}
