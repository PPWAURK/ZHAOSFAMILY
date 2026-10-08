import type { AuthUser } from "@zhao/types";
import * as SecureStore from "expo-secure-store";
import type { AuthUserSnapshotStorage } from "@zhao/auth/storage";

const USER_SNAPSHOT_KEY = "zhao_mobile_user_snapshot_v1";
const USER_SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type StoredUserSnapshot = {
  savedAt: number;
  user: AuthUser;
  version: 1;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readOptionalString(
  record: Record<string, unknown>,
  key: string,
): string | null | undefined {
  const value = record[key];
  return typeof value === "string" || value === null ? value : undefined;
}

function toOfflineUser(user: AuthUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    firstName: user.firstName,
    givenName: user.givenName,
    lastName: user.lastName,
    familyName: user.familyName,
    surname: user.surname,
    role: user.role,
    position: user.position,
    jobRole: user.jobRole,
    storeName: user.storeName,
    establishment: user.establishment,
    avatar: user.avatar,
    avatarUrl: user.avatarUrl,
    preferredLanguage: user.preferredLanguage,
    mobileOnboardingCompletedAt: user.mobileOnboardingCompletedAt,
    store: user.store ? { id: user.store.id, name: user.store.name } : user.store,
  };
}

function parseStoredSnapshot(value: unknown): StoredUserSnapshot | null {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.user)) return null;
  if (typeof value.savedAt !== "number" || !Number.isFinite(value.savedAt)) return null;

  const user = value.user;
  if (!(typeof user.id === "number" || typeof user.id === "string")) return null;

  let store: AuthUser["store"] = undefined;
  if (user.store === null) {
    store = null;
  } else if (isRecord(user.store)) {
    const storeId = user.store.id;
    store = {
      id: typeof storeId === "number" || typeof storeId === "string" ? storeId : undefined,
      name: readOptionalString(user.store, "name"),
    };
  }

  const offlineUser: AuthUser = {
    id: user.id,
    email: readOptionalString(user, "email"),
    name: readOptionalString(user, "name"),
    firstName: readOptionalString(user, "firstName"),
    givenName: readOptionalString(user, "givenName"),
    lastName: readOptionalString(user, "lastName"),
    familyName: readOptionalString(user, "familyName"),
    surname: readOptionalString(user, "surname"),
    role: readOptionalString(user, "role"),
    position: readOptionalString(user, "position"),
    jobRole: readOptionalString(user, "jobRole"),
    storeName: readOptionalString(user, "storeName"),
    establishment: readOptionalString(user, "establishment"),
    avatar: readOptionalString(user, "avatar"),
    avatarUrl: readOptionalString(user, "avatarUrl"),
    preferredLanguage: readOptionalString(user, "preferredLanguage"),
    mobileOnboardingCompletedAt: readOptionalString(user, "mobileOnboardingCompletedAt"),
    store,
  };

  return {
    savedAt: value.savedAt,
    user: offlineUser,
    version: 1,
  };
}

export const mobileUserSnapshotStorage: AuthUserSnapshotStorage = {
  async read(): Promise<AuthUser | null> {
    const serializedSnapshot = await SecureStore.getItemAsync(USER_SNAPSHOT_KEY);
    if (!serializedSnapshot) return null;

    let parsedValue: unknown;
    try {
      parsedValue = JSON.parse(serializedSnapshot);
    } catch {
      await SecureStore.deleteItemAsync(USER_SNAPSHOT_KEY);
      return null;
    }

    const snapshot = parseStoredSnapshot(parsedValue);
    const isFresh =
      snapshot !== null &&
      snapshot.savedAt <= Date.now() &&
      Date.now() - snapshot.savedAt <= USER_SNAPSHOT_MAX_AGE_MS;

    if (!snapshot || !isFresh) {
      await SecureStore.deleteItemAsync(USER_SNAPSHOT_KEY);
      return null;
    }

    return snapshot.user;
  },

  async write(user: AuthUser): Promise<void> {
    const snapshot: StoredUserSnapshot = {
      savedAt: Date.now(),
      user: toOfflineUser(user),
      version: 1,
    };

    await SecureStore.setItemAsync(USER_SNAPSHOT_KEY, JSON.stringify(snapshot));
  },

  clear: (): Promise<void> => SecureStore.deleteItemAsync(USER_SNAPSHOT_KEY),
};
