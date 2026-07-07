import type {
  EmployeeTrainingBadge,
  EmployeeTrainingProgressInput,
  TrainingBadgeDefinition,
} from "@/types/trainingBadge";

const DEFAULT_REQUIRED_SCORE = 80;
const DEFAULT_REQUIRED_COMPLETION_RATE = 100;

function isAssessmentPassed(
  assessmentId: string,
  scoreByAssessmentId: Record<string, number>,
  requiredScore: number,
): boolean {
  const score = scoreByAssessmentId[assessmentId];

  return typeof score === "number" && score >= requiredScore;
}

function getHighestScore(
  assessmentIds: readonly string[],
  scoreByAssessmentId: Record<string, number>,
): number | undefined {
  const scores = assessmentIds
    .map((assessmentId) => scoreByAssessmentId[assessmentId])
    .filter((score): score is number => typeof score === "number");

  if (scores.length === 0) {
    return undefined;
  }

  return Math.max(...scores);
}

export function calculateTrainingBadgeStatus(
  badge: TrainingBadgeDefinition,
  employeeProgress: EmployeeTrainingProgressInput,
): EmployeeTrainingBadge {
  const requiredAssessmentIds = badge.requiredAssessmentIds ?? [];
  const requiredScore = badge.requiredScore ?? DEFAULT_REQUIRED_SCORE;
  const requiredCompletionRate =
    badge.requiredCompletionRate ?? DEFAULT_REQUIRED_COMPLETION_RATE;
  const completedTrainingIds = new Set(employeeProgress.completedTrainingIds);
  const completedTrainingCount = badge.requiredTrainingIds.filter((trainingId) =>
    completedTrainingIds.has(trainingId),
  ).length;
  const passedAssessmentCount = requiredAssessmentIds.filter((assessmentId) =>
    isAssessmentPassed(assessmentId, employeeProgress.assessmentScores, requiredScore),
  ).length;
  const maxProgress = badge.requiredTrainingIds.length + requiredAssessmentIds.length;
  const progress = completedTrainingCount + passedAssessmentCount;
  const completionRate = maxProgress === 0 ? 100 : Math.round((progress / maxProgress) * 100);
  const score = getHighestScore(requiredAssessmentIds, employeeProgress.assessmentScores);
  const trainingsComplete =
    badge.requiredTrainingIds.length === 0 ||
    completedTrainingCount === badge.requiredTrainingIds.length;
  const assessmentsComplete =
    requiredAssessmentIds.length === 0 || passedAssessmentCount === requiredAssessmentIds.length;
  const completionRequirementMet = completionRate >= requiredCompletionRate;

  if (employeeProgress.expiredBadgeIds?.includes(badge.id)) {
    return { badgeId: badge.id, status: "expired", progress, maxProgress, completionRate, score };
  }

  if (employeeProgress.certifiedBadgeIds?.includes(badge.id)) {
    return { badgeId: badge.id, status: "certified", progress, maxProgress, completionRate, score };
  }

  if (trainingsComplete && assessmentsComplete && completionRequirementMet) {
    return { badgeId: badge.id, status: "certified", progress, maxProgress, completionRate, score };
  }

  if (trainingsComplete && requiredAssessmentIds.length > 0 && score !== undefined) {
    return { badgeId: badge.id, status: "failed", progress, maxProgress, completionRate, score };
  }

  if (progress > 0) {
    return { badgeId: badge.id, status: "in_progress", progress, maxProgress, completionRate, score };
  }

  return { badgeId: badge.id, status: "locked", progress, maxProgress, completionRate, score };
}

export function calculateAllTrainingBadges(
  badges: TrainingBadgeDefinition[],
  employeeProgress: EmployeeTrainingProgressInput,
): EmployeeTrainingBadge[] {
  return badges.map((badge) => calculateTrainingBadgeStatus(badge, employeeProgress));
}
