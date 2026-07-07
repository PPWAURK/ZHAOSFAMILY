import type {
  TrainingMapData,
  TrainingMapMaterialNode,
  TrainingMapProgressSummary,
  TrainingPlan,
  TrainingPlanMaterial,
  TrainingPositionGate,
} from "@/features/training/trainingTypes";

function isEffectivelyCompleted(
  material: TrainingPlanMaterial,
): boolean {
  if (material.progress.status !== "completed") return false;

  if (!material.hasQuiz) return true;

  return material.progress.status === "completed";
}

function buildNode(material: TrainingPlanMaterial): TrainingMapMaterialNode {
  return {
    material,
    isCompleted: isEffectivelyCompleted(material),
    isQuizPassed: material.progress.status === "completed",
    hasQuiz: material.hasQuiz,
  };
}

function isSharedMaterial(material: TrainingPlanMaterial): boolean {
  return material.positionId === "ALL";
}

function calculateOverallPercent(summary: TrainingMapProgressSummary): number {
  const total = summary.sharedTotal + summary.requiredTotal + summary.advancedTotal;
  if (total === 0) return 100;
  const completed = summary.sharedCompleted + summary.requiredCompleted + summary.advancedCompleted;
  return Math.round((completed / total) * 100);
}

export function buildTrainingMapData(plan: TrainingPlan): TrainingMapData {
  const shared: TrainingMapMaterialNode[] = [];
  const requiredByPosition = new Map<string, TrainingPlanMaterial[]>();
  const advanced: TrainingMapMaterialNode[] = [];

  for (const material of plan.required) {
    if (isSharedMaterial(material)) {
      shared.push(buildNode(material));
    } else {
      const list = requiredByPosition.get(material.positionId) ?? [];
      list.push(material);
      requiredByPosition.set(material.positionId, list);
    }
  }

  for (const material of plan.optional) {
    advanced.push(buildNode(material));
  }

  const sharedCompleted = shared.filter((n) => n.isCompleted).length;
  const sharedTotal = shared.length;

  const layer1Unlocked = true;
  const layer2Unlocked = sharedTotal === 0 || sharedCompleted === sharedTotal;

  const positionGates: TrainingPositionGate[] = [];
  let requiredCompleted = 0;
  let requiredTotal = 0;

  for (const [positionId, materials] of requiredByPosition) {
    const nodes = materials.map(buildNode);
    const completed = nodes.filter((n) => n.isCompleted).length;
    requiredCompleted += completed;
    requiredTotal += nodes.length;

    positionGates.push({
      positionId,
      positionLabel: positionId,
      materials: nodes,
      completedCount: completed,
      totalCount: nodes.length,
      layer: "required",
    });
  }

  const layer3Unlocked = requiredTotal === 0 || requiredCompleted === requiredTotal;

  const advancedCompleted = advanced.filter((n) => n.isCompleted).length;
  const advancedTotal = advanced.length;

  const summary: TrainingMapProgressSummary = {
    sharedTotal,
    sharedCompleted,
    requiredTotal,
    requiredCompleted,
    advancedTotal,
    advancedCompleted,
    overallPercent: 0,
  };
  summary.overallPercent = calculateOverallPercent(summary);

  return {
    sharedMaterials: shared,
    positionGates,
    advancedMaterials: advanced,
    summary,
    layer1Unlocked,
    layer2Unlocked,
    layer3Unlocked,
  };
}
