import type { AuthLanguage } from "@/features/auth/authCopy";
import type {
  StoreJobRoleOption,
  TrainingPositionOption,
} from "@/features/stores/storeTypes";

const STORE_POSITION_ROOT_CODES = new Set(["FRONT_OF_HOUSE", "KITCHEN"]);
const MANAGEMENT_POSITION_CODES = new Set(["ALL", "SM", "RM", "HOLDING"]);

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
        !STORE_POSITION_ROOT_CODES.has(position.code)
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
  return getStoreAssignableCustomPositions(trainingPositions, language);
}
