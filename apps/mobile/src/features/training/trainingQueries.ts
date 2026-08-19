import type { AuthLanguage } from "@/features/auth/authCopy";
import { TRAINING_COPY } from "./trainingCopy";
import { applyTrainingPositionLabels, buildTrainingPositionLabels } from "./trainingPositionLabels";
import { fetchTrainingMyPlan, fetchTrainingPositions } from "./trainingApi";
import type { TrainingPlan } from "./trainingTypes";

export async function fetchLocalizedTrainingPlan(language: AuthLanguage): Promise<TrainingPlan> {
  const [plan, positions] = await Promise.all([
    fetchTrainingMyPlan(),
    fetchTrainingPositions().catch(() => []),
  ]);
  const positionLabels = buildTrainingPositionLabels(positions, language);

  return applyTrainingPositionLabels(plan, positionLabels, TRAINING_COPY[language]);
}
