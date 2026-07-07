import {
  buildTrainingGuidedFlow,
  groupRequiredMaterialsByPosition,
  isRequiredMaterialLocked,
} from "@/features/training/trainingFlowState";
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
  id: number,
  overrides: Partial<TrainingPlanMaterial> = {},
): TrainingPlanMaterial {
  return {
    id,
    positionId: "ALL",
    type: "PDF",
    isRequired: true,
    title: `Material ${id}`,
    description: null,
    originalName: `material-${id}.pdf`,
    mimeType: "application/pdf",
    sizeBytes: "1024",
    bucket: "training",
    objectKey: `training/material-${id}.pdf`,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    progress: buildProgress({ materialId: id }),
    hasQuiz: false,
    ...overrides,
  };
}

function buildPlan(overrides: Partial<TrainingPlan> = {}): TrainingPlan {
  return {
    positionCodes: ["ALL"],
    required: [buildMaterial(1), buildMaterial(2), buildMaterial(3)],
    optional: [buildMaterial(10, { isRequired: false })],
    summary: {
      requiredTotal: 3,
      requiredCompleted: 0,
      completionPercent: 0,
    },
    ...overrides,
  };
}

describe("buildTrainingGuidedFlow", () => {
  it("returns intro when required materials exist and none were started", () => {
    const flow = buildTrainingGuidedFlow(buildPlan());

    expect(flow.stage).toBe("intro");
    expect(flow.currentMaterial?.id).toBe(1);
    expect(flow.requiredStates.map((state) => state.isLocked)).toEqual([
      false,
      false,
      false,
    ]);
  });

  it("returns learning with every required step unlocked for self-paced study", () => {
    const flow = buildTrainingGuidedFlow(
      buildPlan({
        required: [
          buildMaterial(1, {
            progress: buildProgress({
              materialId: 1,
              status: "completed",
              progressPct: 100,
              completedAt: "2026-06-01T00:00:00.000Z",
            }),
          }),
          buildMaterial(2, {
            progress: buildProgress({
              materialId: 2,
              status: "in_progress",
              progressPct: 45,
              lastOpenedAt: "2026-06-01T00:00:00.000Z",
            }),
          }),
          buildMaterial(3),
        ],
      }),
    );

    expect(flow.stage).toBe("learning");
    expect(flow.currentMaterial?.id).toBe(2);
    expect(flow.requiredStates.map((state) => ({
      id: state.materialId,
      current: state.isCurrent,
      locked: state.isLocked,
    }))).toEqual([
      { id: 1, current: false, locked: false },
      { id: 2, current: true, locked: false },
      { id: 3, current: false, locked: false },
    ]);
    expect(isRequiredMaterialLocked(flow, 3)).toBe(false);
  });

  it("returns completed when every required material is completed", () => {
    const completedProgress = (materialId: number) =>
      buildProgress({
        materialId,
        status: "completed",
        progressPct: 100,
        completedAt: "2026-06-01T00:00:00.000Z",
      });
    const flow = buildTrainingGuidedFlow(
      buildPlan({
        required: [
          buildMaterial(1, { progress: completedProgress(1) }),
          buildMaterial(2, { progress: completedProgress(2) }),
        ],
        summary: {
          requiredTotal: 2,
          requiredCompleted: 2,
          completionPercent: 100,
        },
      }),
    );

    expect(flow.stage).toBe("completed");
    expect(flow.currentMaterial).toBeNull();
    expect(flow.completedAllRequired).toBe(true);
    expect(flow.requiredStates.every((state) => state.isLocked === false)).toBe(true);
  });

  it("falls back to learning when there are zero required materials", () => {
    const flow = buildTrainingGuidedFlow(
      buildPlan({
        required: [],
        optional: [buildMaterial(10, { isRequired: false })],
        summary: {
          requiredTotal: 0,
          requiredCompleted: 0,
          completionPercent: 0,
        },
      }),
    );

    expect(flow.stage).toBe("learning");
    expect(flow.hasRequiredMaterials).toBe(false);
    expect(flow.currentMaterial).toBeNull();
  });
});

describe("groupRequiredMaterialsByPosition", () => {
  it("buckets materials by position in first-appearance order while keeping global flow state", () => {
    const plan = buildPlan({
      required: [
        buildMaterial(1, { positionId: "FOH" }),
        buildMaterial(2, { positionId: "BOH" }),
        buildMaterial(3, { positionId: "FOH" }),
      ],
      summary: {
        requiredTotal: 3,
        requiredCompleted: 0,
        completionPercent: 0,
      },
    });
    const flow = buildTrainingGuidedFlow(plan);

    const groups = groupRequiredMaterialsByPosition(plan, flow.requiredStates);

    expect(groups.map((group) => group.positionId)).toEqual(["FOH", "BOH"]);
    expect(
      groups.map((group) =>
        group.materials.map((item) => ({
          id: item.material.id,
          order: item.state.order,
          current: item.state.isCurrent,
          locked: item.state.isLocked,
        })),
      ),
    ).toEqual([
      [
        { id: 1, order: 1, current: true, locked: false },
        { id: 3, order: 3, current: false, locked: false },
      ],
      [{ id: 2, order: 2, current: false, locked: false }],
    ]);
  });

  it("skips materials without a matching flow state", () => {
    const plan = buildPlan({
      required: [
        buildMaterial(1, { positionId: "FOH" }),
        buildMaterial(2, { positionId: "BOH" }),
      ],
      summary: {
        requiredTotal: 2,
        requiredCompleted: 0,
        completionPercent: 0,
      },
    });

    const groups = groupRequiredMaterialsByPosition(plan, [
      {
        materialId: 1,
        order: 1,
        status: "not_started",
        progressPct: 0,
        isCompleted: false,
        isCurrent: true,
        isLocked: false,
      },
    ]);

    expect(groups).toEqual([
      {
        positionId: "FOH",
        materials: [
          {
            material: plan.required[0],
            state: {
              materialId: 1,
              order: 1,
              status: "not_started",
              progressPct: 0,
              isCompleted: false,
              isCurrent: true,
              isLocked: false,
            },
          },
        ],
      },
    ]);
  });
});
