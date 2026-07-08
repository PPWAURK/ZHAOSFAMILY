import type { TrainingMapMaterialNode } from "@/features/training/trainingTypes";

export type TrainingMapNodePrimaryAction = "study" | "quiz";

export function canOpenTrainingMapQuiz(
  node: TrainingMapMaterialNode,
): boolean {
  return node.hasQuiz && node.material.progress.status === "completed";
}

export function getTrainingMapNodePrimaryAction(
  node: TrainingMapMaterialNode,
): TrainingMapNodePrimaryAction {
  return canOpenTrainingMapQuiz(node) ? "quiz" : "study";
}
