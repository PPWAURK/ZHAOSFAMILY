import type { MobilePermissionUser, MobileStore, TrainingPositionOption } from "./storeTypes";
import {
  fetchApprovableUsers,
  fetchManageableStores,
  fetchTrainingPositions,
} from "./storeApi";

export type StoreManagementData = {
  stores: MobileStore[];
  trainingPositions: TrainingPositionOption[];
  users: MobilePermissionUser[];
};

export async function fetchStoreManagementData(): Promise<StoreManagementData> {
  const [stores, users, trainingPositions] = await Promise.all([
    fetchManageableStores(),
    fetchApprovableUsers(),
    fetchTrainingPositions(),
  ]);

  return { stores, trainingPositions, users };
}
