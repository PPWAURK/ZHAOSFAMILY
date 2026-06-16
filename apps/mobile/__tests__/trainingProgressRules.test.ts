import {
  applyMaterialProgress,
  assessViewerStats,
  IMAGE_MIN_VIEW_SECONDS,
  pdfMinReadSeconds,
} from "@/features/training/trainingProgressRules";
import type {
  TrainingMaterialProgress,
  TrainingPlan,
  TrainingPlanMaterial,
} from "@/features/training/trainingTypes";

function buildProgress(
  overrides: Partial<TrainingMaterialProgress> = {},
): TrainingMaterialProgress {
  return {
    materialId: 1,
    status: "not_started",
    progressPct: 0,
    lastOpenedAt: null,
    completedAt: null,
    ...overrides,
  };
}

function buildMaterial(
  overrides: Partial<TrainingPlanMaterial> = {},
): TrainingPlanMaterial {
  return {
    id: 1,
    positionId: "ALL",
    type: "PDF",
    isRequired: true,
    title: "Hygiène",
    description: null,
    originalName: "hygiene.pdf",
    mimeType: "application/pdf",
    sizeBytes: "1024",
    bucket: "training",
    objectKey: "training/hygiene.pdf",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    progress: buildProgress(),
    hasQuiz: false,
    ...overrides,
  };
}

describe("assessViewerStats", () => {
  it("does not allow completing a video before 90% watched", () => {
    const result = assessViewerStats({
      kind: "video",
      positionPct: 80,
      watchedPct: 60,
      ended: false,
    });

    expect(result.canMarkComplete).toBe(false);
    expect(result.shouldAutoComplete).toBe(false);
    expect(result.progressPct).toBe(80);
  });

  it("auto-completes a video at 90% effective watch time", () => {
    const result = assessViewerStats({
      kind: "video",
      positionPct: 92,
      watchedPct: 90,
      ended: false,
    });

    expect(result.canMarkComplete).toBe(true);
    expect(result.shouldAutoComplete).toBe(true);
  });

  it("auto-completes a video when playback ends", () => {
    const result = assessViewerStats({
      kind: "video",
      positionPct: 100,
      watchedPct: 70,
      ended: true,
    });

    expect(result.shouldAutoComplete).toBe(true);
  });

  it("lets the employee confirm a PDF manually once the last page is reached", () => {
    const numPages = 10;
    const reachedEndEarly = assessViewerStats({
      kind: "pdf",
      maxPage: numPages,
      numPages,
      readSeconds: pdfMinReadSeconds(numPages) - 1,
    });

    expect(reachedEndEarly.canMarkComplete).toBe(true);
    expect(reachedEndEarly.shouldAutoComplete).toBe(false);
  });

  it("only auto-completes a PDF after last page and minimum reading time", () => {
    const numPages = 10;
    const incomplete = assessViewerStats({
      kind: "pdf",
      maxPage: numPages - 1,
      numPages,
      readSeconds: pdfMinReadSeconds(numPages) + 100,
    });
    const read = assessViewerStats({
      kind: "pdf",
      maxPage: numPages,
      numPages,
      readSeconds: pdfMinReadSeconds(numPages),
    });

    expect(incomplete.canMarkComplete).toBe(false);
    expect(incomplete.shouldAutoComplete).toBe(false);
    expect(incomplete.progressPct).toBe(90);
    expect(read.shouldAutoComplete).toBe(true);
  });

  it("caps the PDF minimum reading time for long documents", () => {
    expect(pdfMinReadSeconds(500)).toBe(120);
  });

  it("only enables manual completion for images after the dwell time", () => {
    const early = assessViewerStats({ kind: "image", viewedSeconds: 1 });
    const viewed = assessViewerStats({
      kind: "image",
      viewedSeconds: IMAGE_MIN_VIEW_SECONDS,
    });

    expect(early.canMarkComplete).toBe(false);
    expect(viewed.canMarkComplete).toBe(true);
    expect(viewed.shouldAutoComplete).toBe(false);
  });
});

describe("applyMaterialProgress", () => {
  it("updates the material everywhere and recomputes the summary", () => {
    const plan: TrainingPlan = {
      positionCodes: ["ALL"],
      required: [
        buildMaterial({ id: 1 }),
        buildMaterial({
          id: 2,
          progress: buildProgress({ materialId: 2, status: "completed", progressPct: 100 }),
        }),
      ],
      optional: [buildMaterial({ id: 1, positionId: "FOH", isRequired: false })],
      summary: {
        requiredTotal: 2,
        requiredCompleted: 1,
        completionPercent: 50,
      },
    };

    const completed = buildProgress({
      status: "completed",
      progressPct: 100,
      completedAt: "2026-06-10T00:00:00.000Z",
    });
    const next = applyMaterialProgress(plan, 1, completed);

    expect(next.required[0].progress.status).toBe("completed");
    expect(next.optional[0].progress.status).toBe("completed");
    expect(next.summary).toEqual({
      requiredTotal: 2,
      requiredCompleted: 2,
      completionPercent: 100,
    });
  });

  it("keeps the summary in sync for partial progress updates", () => {
    const plan: TrainingPlan = {
      positionCodes: ["ALL"],
      required: [buildMaterial({ id: 1 })],
      optional: [],
      summary: {
        requiredTotal: 1,
        requiredCompleted: 0,
        completionPercent: 0,
      },
    };

    const next = applyMaterialProgress(
      plan,
      1,
      buildProgress({ status: "in_progress", progressPct: 40 }),
    );

    expect(next.required[0].progress.progressPct).toBe(40);
    expect(next.summary.completionPercent).toBe(0);
  });
});
