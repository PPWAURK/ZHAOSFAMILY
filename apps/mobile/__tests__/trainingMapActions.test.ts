import {
  canOpenTrainingMapQuiz,
  getTrainingMapNodePrimaryAction,
} from "@/features/training/trainingMapActions";
import type {
  TrainingMapMaterialNode,
  TrainingMaterialProgress,
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

function buildNode(
  overrides: Partial<TrainingPlanMaterial> = {},
): TrainingMapMaterialNode {
  const material: TrainingPlanMaterial = {
    id: 1,
    positionId: "ALL",
    type: "PDF",
    isRequired: true,
    title: "Hygiene",
    description: null,
    originalName: "hygiene.pdf",
    mimeType: "application/pdf",
    sizeBytes: "1024",
    bucket: "training",
    objectKey: "training/hygiene.pdf",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    progress: buildProgress(),
    hasQuiz: true,
    ...overrides,
  };

  return {
    material,
    isCompleted: material.progress.status === "completed",
    isQuizPassed: material.progress.status === "completed",
    hasQuiz: material.hasQuiz,
  };
}

describe("training map actions", () => {
  it("opens study first when a quiz material is not completed", () => {
    const node = buildNode({
      progress: buildProgress({
        status: "in_progress",
        progressPct: 80,
      }),
    });

    expect(canOpenTrainingMapQuiz(node)).toBe(false);
    expect(getTrainingMapNodePrimaryAction(node)).toBe("study");
  });

  it("opens quiz directly when the material has been completed", () => {
    const node = buildNode({
      progress: buildProgress({
        status: "completed",
        progressPct: 100,
        completedAt: "2026-07-08T00:00:00.000Z",
      }),
    });

    expect(canOpenTrainingMapQuiz(node)).toBe(true);
    expect(getTrainingMapNodePrimaryAction(node)).toBe("quiz");
  });

  it("keeps completed materials without quizzes in study mode", () => {
    const node = buildNode({
      hasQuiz: false,
      progress: buildProgress({
        status: "completed",
        progressPct: 100,
        completedAt: "2026-07-08T00:00:00.000Z",
      }),
    });

    expect(canOpenTrainingMapQuiz(node)).toBe(false);
    expect(getTrainingMapNodePrimaryAction(node)).toBe("study");
  });
});
