import { useCallback, useEffect, useMemo, useState } from "react";
import {
  InteractionManager,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { storeManagementQueryKeys } from "@zhao/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuthUser } from "@zhao/types";
import { useScreenName } from "@/lib/useScreenName";
import { preloadCriticalImages } from "@/lib/pagePreloadManager";
import { ZhaoLoadingIndicator } from "@/components/ZhaoLoadingIndicator";
import { useConfirm } from "@/components/confirm/ConfirmProvider";
import { useToast } from "@/components/toast/ToastProvider";
import { TrackingText, authControlStyles } from "@/features/auth/AuthFormControls";
import type { AuthLanguage } from "@/features/auth/authCopy";
import {
  PendingUserCard,
  StoreDetailActionCard,
  StoreCard,
  TeamUserCard,
} from "@/features/stores/StoreModuleParts";
import {
  STORE_COPY,
  STORE_JOB_ROLE_OPTIONS,
} from "@/features/stores/storeCopy";
import {
  fetchApprovableUsers,
  fetchManageableStores,
  fetchTrainingPositions,
  removePermissionUser,
  updateUserApproval,
  updateUserJobRole,
  type UpdateUserApprovalResult,
} from "@/features/stores/storeApi";
import { storeStyles as styles } from "@/features/stores/storeStyles";
import type {
  MobilePermissionUser,
  StoreApprovalDraft,
  StoreJobRoleOption,
  StoreTeamDraft,
  TrainingPositionOption,
} from "@/features/stores/storeTypes";

type StoresModuleScreenProps = {
  isActive?: boolean;
  language: AuthLanguage;
  user: AuthUser;
};

type StoreDetailView = "overview" | "pending" | "team" | "stats";

const STORE_POSITION_ROOT_CODES = new Set(["FRONT_OF_HOUSE", "KITCHEN"]);
const MANAGEMENT_POSITION_CODES = new Set(["ALL", "SM", "RM", "HOLDING"]);
const INITIAL_STORE_CARD_COUNT = 3;
const STORE_CARD_BATCH_SIZE = 3;
const STORE_QUERY_STALE_TIME_MS = 5 * 60 * 1000;

function getJobRoleValues(user: AuthUser): string[] {
  return `${user.jobRole || user.position || user.role || ""}`
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
}

function canManageHoldingRole(user: AuthUser): boolean {
  return (
    getJobRoleValues(user).includes("holding") ||
    (user.permissions || []).includes("system.permission.manage")
  );
}

function canManageRegionalJobRoles(user: AuthUser): boolean {
  return getJobRoleValues(user).includes("regional-manager");
}

function getOperationalTrainingPositionOptions(
  positions: TrainingPositionOption[],
  language: AuthLanguage,
): StoreJobRoleOption[] {
  const options: StoreJobRoleOption[] = [];

  function visit(
    items: TrainingPositionOption[],
    isOperationalBranch: boolean,
    isManagementBranch: boolean,
  ): void {
    for (const position of items) {
      const nextIsOperationalBranch =
        isOperationalBranch || STORE_POSITION_ROOT_CODES.has(position.code);
      const nextIsManagementBranch =
        isManagementBranch || MANAGEMENT_POSITION_CODES.has(position.code);

      if (
        position.isActive &&
        nextIsOperationalBranch &&
        !nextIsManagementBranch &&
        !STORE_POSITION_ROOT_CODES.has(position.code)
      ) {
        options.push({
          value: position.code,
          label: position.name[language] || position.name.zh || position.code,
        });
      }

      visit(position.children, nextIsOperationalBranch, nextIsManagementBranch);
    }
  }

  visit(positions, false, false);
  return options;
}

function getVisibleRoleOptions(
  language: AuthLanguage,
  user: AuthUser,
  trainingPositions: TrainingPositionOption[],
): StoreJobRoleOption[] {
  const options = STORE_JOB_ROLE_OPTIONS[language];
  const positionOptions = getOperationalTrainingPositionOptions(
    trainingPositions,
    language,
  );
  const managementOptions = options.filter((option) =>
    ["holding", "regional-manager", "store-manager"].includes(option.value),
  );

  // Holding/admins may assign any role; regional and store managers use
  // the same hierarchy enforced by the backend.
  if (canManageHoldingRole(user)) {
    return [...managementOptions, ...positionOptions];
  }

  return canManageRegionalJobRoles(user)
    ? [
        ...managementOptions.filter((option) => option.value === "store-manager"),
        ...positionOptions,
      ]
    : positionOptions;
}

function getUsersForStore(users: MobilePermissionUser[], storeId: number): MobilePermissionUser[] {
  return users.filter((user) => user.restaurant?.id === storeId);
}

function parseRoleValues(jobRole: string | null | undefined): string[] {
  return `${jobRole || ""}`
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
}

// Label the *applied* position using the full role table (incl. 前厅/厨房/经理),
// not the filtered assignable options the selector renders.
function formatAppliedRoleLabel(
  jobRole: string | null | undefined,
  language: AuthLanguage,
  roleOptions: StoreJobRoleOption[],
): string {
  const labels = parseRoleValues(jobRole).map(
    (value) =>
      roleOptions.find((option) => option.value === value)?.label ||
      STORE_JOB_ROLE_OPTIONS[language].find((option) => option.value === value)?.label ||
      value,
  );

  return labels.length > 0 ? labels.join(" / ") : "-";
}

function upsertUser(
  users: MobilePermissionUser[],
  nextUser: MobilePermissionUser,
): MobilePermissionUser[] {
  return users.map((user) => (user.id === nextUser.id ? nextUser : user));
}

function userMatchesSearch(user: MobilePermissionUser, searchTerm: string): boolean {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  if (!normalizedSearch) return true;

  return `${user.name || ""} ${user.email || ""}`.toLowerCase().includes(normalizedSearch);
}

function userHasRole(user: MobilePermissionUser, roleValue: string): boolean {
  if (!roleValue) return true;

  return parseRoleValues(user.jobRole).includes(roleValue);
}

export function StoresModuleScreen({ isActive = true, language, user }: StoresModuleScreenProps) {
  useScreenName("stores");
  const confirm = useConfirm();
  const toast = useToast();
  const copy = STORE_COPY[language];
  const queryClient = useQueryClient();
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [detailView, setDetailView] = useState<StoreDetailView>("overview");
  const [isInitialStorePhotoBatchReady, setIsInitialStorePhotoBatchReady] = useState(false);
  const [visibleStoreCardCount, setVisibleStoreCardCount] = useState(
    INITIAL_STORE_CARD_COUNT,
  );
  const storesQueryKey = storeManagementQueryKeys.stores(user.id);
  const usersQueryKey = storeManagementQueryKeys.approvableUsers(user.id);
  const storesQuery = useQuery({
    enabled: isActive,
    meta: { persist: true },
    placeholderData: (previousData) => previousData,
    queryFn: fetchManageableStores,
    queryKey: storesQueryKey,
    staleTime: STORE_QUERY_STALE_TIME_MS,
  });
  const usersQuery = useQuery({
    // The approvals response can contain every employee and their roles. Do not
    // make the card list compete with that heavier request on a cold open.
    enabled: isActive && Boolean(storesQuery.data),
    meta: { persist: true },
    placeholderData: (previousData) => previousData,
    queryFn: fetchApprovableUsers,
    queryKey: usersQueryKey,
    staleTime: STORE_QUERY_STALE_TIME_MS,
  });
  const trainingPositionsQuery = useQuery({
    // Positions are only used by the selected store's staff-management views.
    enabled: isActive && selectedStoreId !== null,
    meta: { persist: true },
    placeholderData: (previousData) => previousData,
    queryFn: fetchTrainingPositions,
    queryKey: storeManagementQueryKeys.trainingPositions(),
    staleTime: STORE_QUERY_STALE_TIME_MS,
  });
  const stores = storesQuery.data ?? [];
  const users = usersQuery.data ?? [];
  const trainingPositions = trainingPositionsQuery.data ?? [];
  const isLoading = storesQuery.isPending;
  const loadErrorMessage = storesQuery.isError
    ? (storesQuery.error instanceof Error && storesQuery.error.message === "INSUFFICIENT_PERMISSIONS"
        ? copy.unavailable
        : copy.error)
    : "";
  const roleOptions = useMemo(
    () => getVisibleRoleOptions(language, user, trainingPositions),
    [language, trainingPositions, user],
  );
  const [approvalDrafts, setApprovalDrafts] = useState<Record<number, StoreApprovalDraft>>({});
  const [teamDrafts, setTeamDrafts] = useState<Record<number, StoreTeamDraft>>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [reviewingUserId, setReviewingUserId] = useState<number | null>(null);
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [deactivatingUserId, setDeactivatingUserId] = useState<number | null>(null);
  const [teamSearchTerm, setTeamSearchTerm] = useState("");
  const [teamRoleFilter, setTeamRoleFilter] = useState("");
  const visibleErrorMessage = errorMessage || loadErrorMessage;

  const updateApprovableUsers = useCallback(
    (updater: (current: MobilePermissionUser[]) => MobilePermissionUser[]): void => {
      queryClient.setQueryData<MobilePermissionUser[]>(usersQueryKey, (current) =>
        current ? updater(current) : current,
      );
    },
    [queryClient, usersQueryKey],
  );

  const storeUserCounts = useMemo(() => {
    const countsByStoreId = new Map<number, { pending: number; team: number }>();

    for (const permissionUser of users) {
      const storeId = permissionUser.restaurant?.id;
      if (!storeId) continue;

      const counts = countsByStoreId.get(storeId) || { pending: 0, team: 0 };
      if (permissionUser.accountStatus === "pending") counts.pending += 1;
      if (permissionUser.accountStatus === "approved") counts.team += 1;
      countsByStoreId.set(storeId, counts);
    }

    return countsByStoreId;
  }, [users]);

  const selectedStore = stores.find((store) => store.id === selectedStoreId) || null;
  const selectedStoreUsers = selectedStore ? getUsersForStore(users, selectedStore.id) : [];
  const pendingUsers = selectedStoreUsers.filter((item) => item.accountStatus === "pending");
  const teamUsers = selectedStoreUsers.filter((item) => item.accountStatus === "approved");
  const activeStoreUsers = selectedStoreUsers.filter(
    (item) => item.accountStatus === "pending" || item.accountStatus === "approved",
  );
  const filteredTeamUsers = teamUsers.filter(
    (item) => userMatchesSearch(item, teamSearchTerm) && userHasRole(item, teamRoleFilter),
  );
  const roleStats = roleOptions.map((roleOption) => ({
    ...roleOption,
    count: activeStoreUsers.filter((item) =>
      parseRoleValues(item.jobRole).includes(roleOption.value),
    ).length,
  }));

  useEffect(() => {
    if (!storesQuery.data) return undefined;

    let isCancelled = false;
    setVisibleStoreCardCount(Math.min(INITIAL_STORE_CARD_COUNT, stores.length));
    setIsInitialStorePhotoBatchReady(false);

    void preloadCriticalImages(
      stores.slice(0, INITIAL_STORE_CARD_COUNT).map((store) => store.photoUri),
    ).finally(() => {
      if (!isCancelled) setIsInitialStorePhotoBatchReady(true);
    });

    return () => {
      isCancelled = true;
    };
  }, [stores, storesQuery.data]);

  useEffect(() => {
    if (
      !isInitialStorePhotoBatchReady ||
      visibleStoreCardCount >= stores.length
    ) {
      return undefined;
    }

    const interaction = InteractionManager.runAfterInteractions(() => {
      setVisibleStoreCardCount((currentCount) =>
        Math.min(currentCount + STORE_CARD_BATCH_SIZE, stores.length),
      );
    });

    return () => interaction.cancel();
  }, [isInitialStorePhotoBatchReady, stores.length, visibleStoreCardCount]);

  useEffect(() => {
    if (!usersQuery.data) return;

    setApprovalDrafts(buildApprovalDrafts(usersQuery.data));
    setTeamDrafts(buildTeamDrafts(usersQuery.data));
  }, [usersQuery.data]);

  function buildApprovalDrafts(users: MobilePermissionUser[]): Record<number, StoreApprovalDraft> {
    return users.reduce<Record<number, StoreApprovalDraft>>((drafts, item) => {
      if (item.accountStatus === "pending") {
        // Start empty: the registration role is the *applied* position (shown
        // read-only), not an assignable workstation. The reviewer must pick one
        // of the allowed line-staff roles, otherwise the backend rejects it.
        drafts[item.id] = { jobRole: "" };
      }

      return drafts;
    }, {});
  }

  function buildTeamDrafts(users: MobilePermissionUser[]): Record<number, StoreTeamDraft> {
    return users.reduce<Record<number, StoreTeamDraft>>((drafts, item) => {
      if (item.accountStatus === "approved") {
        drafts[item.id] = { jobRole: item.jobRole || "" };
      }

      return drafts;
    }, {});
  }

  function patchApprovalDraft(userId: number, jobRole: string): void {
    setErrorMessage("");
    setApprovalDrafts((current) => ({
      ...current,
      [userId]: { jobRole },
    }));
  }

  function patchTeamDraft(userId: number, jobRole: string): void {
    setErrorMessage("");
    setTeamDrafts((current) => ({
      ...current,
      [userId]: { jobRole },
    }));
  }

  async function reviewUser(
    permissionUser: MobilePermissionUser,
    accountStatus: "approved" | "rejected",
  ): Promise<void> {
    if (!selectedStore) return;

    const draft = approvalDrafts[permissionUser.id] || { jobRole: "" };

    setReviewingUserId(permissionUser.id);
    setErrorMessage("");

    try {
      const result = await updateUserApproval(
        permissionUser.id,
        accountStatus,
        accountStatus === "approved"
          ? {
              restaurantId: selectedStore.id,
              jobRole: draft.jobRole,
            }
          : {},
      );

      if (isDeletedApprovalResult(result)) {
        updateApprovableUsers((current) =>
          current.filter((currentUser) => currentUser.id !== permissionUser.id),
        );
        setApprovalDrafts((current) => {
          const nextDrafts = { ...current };
          delete nextDrafts[permissionUser.id];
          return nextDrafts;
        });
        return;
      }

      const updatedUser = result;

      updateApprovableUsers((current) => upsertUser(current, updatedUser));
      setApprovalDrafts((current) => {
        const nextDrafts = { ...current };
        delete nextDrafts[permissionUser.id];
        return nextDrafts;
      });
      if (updatedUser.accountStatus === "approved") {
        setTeamDrafts((current) => ({
          ...current,
          [updatedUser.id]: { jobRole: updatedUser.jobRole || "" },
        }));
      }
    } catch {
      toast.error(copy.updateError);
    } finally {
      setReviewingUserId(null);
    }
  }

  async function saveTeamRole(
    permissionUser: MobilePermissionUser,
    jobRoleOverride?: string,
  ): Promise<void> {
    const jobRole = jobRoleOverride ?? teamDrafts[permissionUser.id]?.jobRole;
    if (!jobRole) return;

    setSavingUserId(permissionUser.id);
    setErrorMessage("");

    try {
      const updatedUser = await updateUserJobRole(permissionUser.id, jobRole);

      updateApprovableUsers((current) => upsertUser(current, updatedUser));
      setTeamDrafts((current) => ({
        ...current,
        [updatedUser.id]: { jobRole: updatedUser.jobRole || "" },
      }));
      // No success banner here: toggling is auto-saved and the green switch is
      // the feedback. Showing/clearing a banner above the list made the page
      // jump up/down on every toggle.
    } catch {
      toast.error(copy.roleSaveError);
    } finally {
      setSavingUserId(null);
    }
  }

  async function deactivateTeamUser(permissionUser: MobilePermissionUser): Promise<void> {
    setDeactivatingUserId(permissionUser.id);
    setErrorMessage("");

    try {
      await removePermissionUser(permissionUser.id);

      updateApprovableUsers((current) =>
        current.filter((currentUser) => currentUser.id !== permissionUser.id),
      );
      setTeamDrafts((current) => {
        const nextDrafts = { ...current };
        delete nextDrafts[permissionUser.id];
        return nextDrafts;
      });
      toast.success(copy.employeeDeactivated);
    } catch {
      toast.error(copy.employeeDeactivateError);
    } finally {
      setDeactivatingUserId(null);
    }
  }

  async function confirmDeactivateTeamUser(permissionUser: MobilePermissionUser): Promise<void> {
    const confirmed = await confirm({
      title: copy.deactivateEmployeeTitle,
      message: copy.deactivateEmployeeBody,
      confirmLabel: copy.deactivateConfirm,
      cancelLabel: copy.deactivateCancel,
      tone: "danger",
    });
    if (confirmed) {
      void deactivateTeamUser(permissionUser);
    }
  }

  const openStore = useCallback((storeId: number): void => {
    setSelectedStoreId(storeId);
    setDetailView("overview");
    setTeamSearchTerm("");
    setTeamRoleFilter("");
    setErrorMessage("");
  }, []);

  if (selectedStore) {
    const isOverview = detailView === "overview";

    return (
      <View style={styles.container}>
        <Pressable
          style={styles.backButton}
          onPress={() => {
            if (isOverview) {
              setSelectedStoreId(null);
            } else {
              setDetailView("overview");
            }
            setErrorMessage("");
          }}
        >
          <Text style={styles.backButtonText}>
            {isOverview ? copy.backToList : copy.backToStore}
          </Text>
        </Pressable>

        <View style={styles.detailHero}>
          <TrackingText color={authControlStyles.colors.red} size={10}>
            {selectedStore.storeCode}
          </TrackingText>
          <Text style={styles.detailTitle}>{selectedStore.name}</Text>
          <Text style={styles.hint}>{selectedStore.address || "-"}</Text>
          <View style={styles.cardStats}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>{copy.pending}</Text>
              <Text style={styles.statValue}>{pendingUsers.length}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>{copy.team}</Text>
              <Text style={styles.statValue}>{teamUsers.length}</Text>
            </View>
          </View>
        </View>

        {visibleErrorMessage ? <Text style={styles.message}>{visibleErrorMessage}</Text> : null}

        {detailView === "overview" ? (
          <View style={styles.list}>
            <StoreDetailActionCard
              count={pendingUsers.length}
              hint={copy.pendingCardHint}
              label={copy.pending}
              onPress={() => setDetailView("pending")}
            />
            <StoreDetailActionCard
              count={teamUsers.length}
              hint={copy.teamCardHint}
              label={copy.team}
              onPress={() => setDetailView("team")}
            />
            <StoreDetailActionCard
              count={activeStoreUsers.length}
              hint={copy.statsCardHint}
              label={copy.stats}
              onPress={() => setDetailView("stats")}
            />
          </View>
        ) : null}

        {detailView === "pending" ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{copy.pending}</Text>
              <Text style={styles.statLabel}>{pendingUsers.length}</Text>
            </View>
            {pendingUsers.length === 0 ? (
              <Text style={styles.emptyText}>{copy.noPending}</Text>
            ) : (
              pendingUsers.map((item) => (
                <PendingUserCard
                  key={item.id}
                  copy={copy}
                  appliedRoleLabel={formatAppliedRoleLabel(
                    item.jobRole,
                    language,
                    roleOptions,
                  )}
                  draft={approvalDrafts[item.id] || { jobRole: "" }}
                  isReviewing={reviewingUserId === item.id}
                  roleOptions={roleOptions}
                  user={item}
                  onPatchDraft={(jobRole) => patchApprovalDraft(item.id, jobRole)}
                  onReview={(status) => void reviewUser(item, status)}
                />
              ))
            )}
          </View>
        ) : null}

        {detailView === "team" ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{copy.team}</Text>
              <Text style={styles.statLabel}>{filteredTeamUsers.length}</Text>
            </View>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={copy.searchPlaceholder}
              placeholderTextColor={authControlStyles.colors.ink40}
              style={styles.searchInput}
              value={teamSearchTerm}
              onChangeText={setTeamSearchTerm}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScrollerContent}
              style={styles.filterScroller}
            >
              <Pressable
                style={[styles.filterPill, !teamRoleFilter ? styles.filterPillActive : null]}
                onPress={() => setTeamRoleFilter("")}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    !teamRoleFilter ? styles.filterPillTextActive : null,
                  ]}
                >
                  {copy.filterAll}
                </Text>
              </Pressable>
              {roleOptions.map((roleOption) => {
                const isActive = teamRoleFilter === roleOption.value;

                return (
                  <Pressable
                    key={roleOption.value}
                    style={[styles.filterPill, isActive ? styles.filterPillActive : null]}
                    onPress={() => setTeamRoleFilter(roleOption.value)}
                  >
                    <Text
                      style={[styles.filterPillText, isActive ? styles.filterPillTextActive : null]}
                    >
                      {roleOption.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            {teamUsers.length === 0 ? (
              <Text style={styles.emptyText}>{copy.noTeam}</Text>
            ) : filteredTeamUsers.length === 0 ? (
              <Text style={styles.emptyText}>{copy.noSearchResult}</Text>
            ) : (
              filteredTeamUsers.map((item) => (
                <TeamUserCard
                  key={item.id}
                  copy={copy}
                  draft={teamDrafts[item.id] || { jobRole: item.jobRole || "" }}
                  isDeactivating={deactivatingUserId === item.id}
                  isSaving={savingUserId === item.id}
                  roleOptions={roleOptions}
                  user={item}
                  onDeactivate={() => void confirmDeactivateTeamUser(item)}
                  onPatchDraft={(jobRole) => {
                    patchTeamDraft(item.id, jobRole);
                    void saveTeamRole(item, jobRole);
                  }}
                />
              ))
            )}
          </View>
        ) : null}

        {detailView === "stats" ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{copy.stats}</Text>
              <Text style={styles.statLabel}>{activeStoreUsers.length}</Text>
            </View>
            <View style={styles.statsList}>
              <View style={styles.statsRow}>
                <Text style={styles.cardMeta}>{copy.totalMembers}</Text>
                <Text style={styles.statValue}>{activeStoreUsers.length}</Text>
              </View>
              <View style={styles.statsRow}>
                <Text style={styles.cardMeta}>{copy.pending}</Text>
                <Text style={styles.statValue}>{pendingUsers.length}</Text>
              </View>
              <View style={styles.statsRow}>
                <Text style={styles.cardMeta}>{copy.team}</Text>
                <Text style={styles.statValue}>{teamUsers.length}</Text>
              </View>
              {roleStats.map((roleStat, index) => (
                <View
                  key={roleStat.value}
                  style={[
                    styles.statsRow,
                    index === roleStats.length - 1 ? styles.statsRowLast : null,
                  ]}
                >
                  <Text style={styles.cardMeta}>{roleStat.label}</Text>
                  <Text style={styles.statValue}>{roleStat.count}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TrackingText color={authControlStyles.colors.red} size={10.5}>
          {copy.titleKicker}
        </TrackingText>
        <Text style={styles.title}>
          {copy.listTitle}
          <Text style={styles.titleAccent}>.</Text>
        </Text>
        <Text style={styles.hint}>{copy.listHint}</Text>
      </View>

      {isLoading ? (
        <View style={styles.actionRow}>
          <ZhaoLoadingIndicator label={copy.loading} />
        </View>
      ) : null}

      {!isLoading && visibleErrorMessage ? (
        <Text style={styles.message}>{visibleErrorMessage}</Text>
      ) : null}

      {!isLoading && !visibleErrorMessage && stores.length === 0 ? (
        <Text style={styles.emptyText}>{copy.empty}</Text>
      ) : null}

      {!isLoading && stores.length > 0 ? (
        <View style={styles.list}>
          {stores.slice(0, visibleStoreCardCount).map((store, index) => {
            const storeCounts = storeUserCounts.get(store.id);

            return (
              <StoreCard
                key={store.id}
                copy={copy}
                isContentReady={isInitialStorePhotoBatchReady || index >= INITIAL_STORE_CARD_COUNT}
                imageLoadPriority={index < 3 ? "critical" : "lazy"}
                pendingCount={usersQuery.data ? (storeCounts?.pending ?? 0) : null}
                store={store}
                teamCount={usersQuery.data ? (storeCounts?.team ?? 0) : null}
                onPress={openStore}
              />
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function isDeletedApprovalResult(
  result: UpdateUserApprovalResult,
): result is { message: "EMPLOYEE_DELETED" } {
  return "message" in result;
}
