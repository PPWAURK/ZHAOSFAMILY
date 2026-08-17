import type { AuthLanguage } from "@/features/auth/authCopy";
import type {
  TrainingPlan,
  TrainingPlanMaterial,
  TrainingPositionOption,
} from "@/features/training/trainingTypes";

type TrainingPositionCopy = {
  positionLabels: Record<string, string>;
  unknownPosition: string;
};

export function buildTrainingPositionLabels(
  positions: TrainingPositionOption[],
  language: AuthLanguage,
): Record<string, string> {
  const labels: Record<string, string> = {};

  function addPosition(position: TrainingPositionOption): void {
    const label =
      position.name[language] || position.name.zh || position.name.en || position.name.fr;

    if (label) {
      labels[position.code] = label;
      labels[position.code.toUpperCase()] = label;
    }

    position.children.forEach(addPosition);
  }

  positions.forEach(addPosition);

  return labels;
}

export function getTrainingPositionLabel(
  positionCode: string,
  positionLabels: Record<string, string>,
  copy: TrainingPositionCopy,
): string {
  const normalizedCode = positionCode.trim().toUpperCase();

  return (
    positionLabels[positionCode] ||
    positionLabels[normalizedCode] ||
    copy.positionLabels[positionCode] ||
    copy.positionLabels[normalizedCode] ||
    copy.unknownPosition
  );
}

export function applyTrainingPositionLabels(
  plan: TrainingPlan,
  positionLabels: Record<string, string>,
  copy: TrainingPositionCopy,
): TrainingPlan {
  function withPositionLabel(material: TrainingPlanMaterial): TrainingPlanMaterial {
    return {
      ...material,
      positionLabel: getTrainingPositionLabel(material.positionId, positionLabels, copy),
    };
  }

  return {
    ...plan,
    positionLabels,
    required: plan.required.map(withPositionLabel),
    optional: plan.optional.map(withPositionLabel),
  };
}
