import type { AuthLanguage } from "@/features/auth/authCopy";
import {
  STORE_MANAGER_ASSIGNABLE_JOB_ROLE_VALUES,
  STORE_JOB_ROLE_OPTIONS,
} from "@/features/stores/storeCopy";
import type {
  StoreJobRoleOption,
  TrainingPositionOption,
} from "@/features/stores/storeTypes";

const STORE_POSITION_ROOT_CODES = new Set(["FOH", "BOH", "CASH"]);
const MANAGEMENT_POSITION_CODES = new Set(["ALL", "SM", "RM", "HOLDING"]);
const BUILT_IN_TRAINING_POSITION_CODES = new Set([
  "ALL",
  "FOH",
  "BOH",
  "CASH",
  "SM",
  "RM",
  "HOLDING",
  "FRONT_HOST",
  "FRONT_CASHIER",
  "FRONT_SERVER",
  "FRONT_PACKER",
  "FRONT_BAR",
  "BACK_DISHWASHER",
  "BACK_NOODLE",
  "BACK_HOT_APPETIZER",
  "BACK_COLD_APPETIZER",
  "BACK_RICE",
]);

function getStoreAssignableCustomPositions(
  positions: TrainingPositionOption[],
  language: AuthLanguage,
): StoreJobRoleOption[] {
  const result: StoreJobRoleOption[] = [];

  function visit(
    items: TrainingPositionOption[],
    isStorePosition: boolean,
    isManagementPosition: boolean,
  ): void {
    for (const position of items) {
      const nextIsStorePosition =
        isStorePosition || STORE_POSITION_ROOT_CODES.has(position.code);
      const nextIsManagementPosition =
        isManagementPosition || MANAGEMENT_POSITION_CODES.has(position.code);

      if (
        position.isActive &&
        nextIsStorePosition &&
        !nextIsManagementPosition &&
        !BUILT_IN_TRAINING_POSITION_CODES.has(position.code)
      ) {
        result.push({
          value: position.code,
          label: position.name[language] || position.name.zh || position.code,
        });
      }

      visit(position.children, nextIsStorePosition, nextIsManagementPosition);
    }
  }

  visit(positions, false, false);
  return result;
}

export function getStoreManagerInvitationRoleOptions(
  language: AuthLanguage,
  trainingPositions: TrainingPositionOption[],
): StoreJobRoleOption[] {
  return [
    ...STORE_JOB_ROLE_OPTIONS[language].filter((option) =>
      STORE_MANAGER_ASSIGNABLE_JOB_ROLE_VALUES.includes(option.value),
    ),
    ...getStoreAssignableCustomPositions(trainingPositions, language),
  ];
}
