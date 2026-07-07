import type {
  TrainingMaterialProgress,
  TrainingPlan,
  TrainingPlanMaterial,
} from "@/features/training/trainingTypes";

export type TrainingGuidedStage = "intro" | "learning" | "completed";

export type RequiredMaterialFlowState = {
  materialId: number;
  order: number;
  status: TrainingMaterialProgress["status"];
  progressPct: number;
  isCompleted: boolean;
  isCurrent: boolean;
  isLocked: boolean;
};

export type TrainingGuidedFlowState = {
  stage: TrainingGuidedStage;
  hasRequiredMaterials: boolean;
  hasStartedRequiredMaterials: boolean;
  completedAllRequired: boolean;
  currentMaterial: TrainingPlanMaterial | null;
  requiredTotal: number;
  requiredCompleted: number;
  optionalTotal: number;
  optionalCompleted: number;
  totalCompleted: number;
  requiredStates: RequiredMaterialFlowState[];
};

function hasStartedMaterial(material: TrainingPlanMaterial): boolean {
  return (
    material.progress.status !== "not_started" ||
    material.progress.progressPct > 0 ||
    Boolean(material.progress.lastOpenedAt) ||
    Boolean(material.progress.completedAt)
  );
}

export function buildTrainingGuidedFlow(
  plan: TrainingPlan,
): TrainingGuidedFlowState {
  const required = plan.required;
  const optional = plan.optional;
  const hasRequiredMaterials = required.length > 0;
  const requiredCompleted = required.filter(
    (material) => material.progress.status === "completed",
  ).length;
  const optionalCompleted = optional.filter(
    (material) => material.progress.status === "completed",
  ).length;
  const totalCompleted = requiredCompleted + optionalCompleted;
  const currentRequiredIndex = required.findIndex(
    (material) => material.progress.status !== "completed",
  );
  const completedAllRequired = hasRequiredMaterials && currentRequiredIndex === -1;
  const hasStartedRequiredMaterials = required.some(hasStartedMaterial);

  const stage: TrainingGuidedStage = !hasRequiredMaterials
    ? "learning"
    : completedAllRequired
      ? "completed"
      : hasStartedRequiredMaterials
        ? "learning"
        : "intro";

  const requiredStates = required.map((material, index) => {
    const isCompleted = material.progress.status === "completed";

    return {
      materialId: material.id,
      order: index + 1,
      status: material.progress.status,
      progressPct: material.progress.progressPct,
      isCompleted,
      isCurrent: currentRequiredIndex !== -1 && currentRequiredIndex === index,
      isLocked: false,
    };
  });

  return {
    stage,
    hasRequiredMaterials,
    hasStartedRequiredMaterials,
    completedAllRequired,
    currentMaterial:
      currentRequiredIndex === -1 ? null : required[currentRequiredIndex] ?? null,
    requiredTotal: required.length,
    requiredCompleted,
    optionalTotal: optional.length,
    optionalCompleted,
    totalCompleted,
    requiredStates,
  };
}

export function isRequiredMaterialLocked(
  flow: TrainingGuidedFlowState,
  materialId: number,
): boolean {
  return (
    flow.requiredStates.find((state) => state.materialId === materialId)?.isLocked ??
    false
  );
}

export type RequiredMaterialGroupItem = {
  material: TrainingPlanMaterial;
  state: RequiredMaterialFlowState;
};

export type RequiredPositionGroup = {
  positionId: string;
  materials: RequiredMaterialGroupItem[];
};

// Display-only grouping: each material keeps its global flow state, so sequential
// lock status and step order are never altered by how positions are bucketed.
export function groupRequiredMaterialsByPosition(
  plan: TrainingPlan,
  requiredStates: RequiredMaterialFlowState[],
): RequiredPositionGroup[] {
  const groups: RequiredPositionGroup[] = [];
  const groupIndexByPosition = new Map<string, number>();

  plan.required.forEach((material, index) => {
    const state = requiredStates[index];
    if (!state) {
      return;
    }

    const existingIndex = groupIndexByPosition.get(material.positionId);
    if (existingIndex === undefined) {
      groupIndexByPosition.set(material.positionId, groups.length);
      groups.push({
        positionId: material.positionId,
        materials: [{ material, state }],
      });
      return;
    }

    groups[existingIndex].materials.push({ material, state });
  });

  return groups;
}
