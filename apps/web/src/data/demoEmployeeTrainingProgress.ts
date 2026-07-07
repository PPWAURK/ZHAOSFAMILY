import type { EmployeeTrainingProgressInput } from "@/types/trainingBadge";

export const demoEmployeeTrainingProgress: EmployeeTrainingProgressInput = {
  completedTrainingIds: [
    "onboarding_basic",
    "store_rules_basic",
    "hygiene_basic",
    "front_basic_service",
    "front_customer_greeting",
  ],
  assessmentScores: {
    onboarding_exam: 92,
    store_rules_exam: 86,
    hygiene_basic_exam: 88,
    front_level_1_exam: 76,
  },
  certifiedBadgeIds: [],
  expiredBadgeIds: [],
};
