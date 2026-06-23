import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { AuthUser } from "@zhao/types";
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
  STORE_ASSIGNABLE_JOB_ROLE_VALUES,
  STORE_JOB_ROLE_OPTIONS,
} from "@/features/stores/storeCopy";
import {
  fetchApprovableUsers,
  fetchManageableStores,
  updateUserApproval,
  updateUserJobRole,
} from "@/features/stores/storeApi";
import { storeStyles as styles } from "@/features/stores/storeStyles";
import type {
  MobilePermissionUser,
  MobileStore,
  StoreApprovalDraft,
  StoreJobRoleOption,
  StoreTeamDraft,
} from "@/features/stores/storeTypes";

type StoresModuleScreenProps = {
  language: AuthLanguage;
  user: AuthUser;
};

type StoresState = {
  stores: MobileStore[];
  users: MobilePermissionUser[];
};

type StoreDetailView = "overview" | "pending" | "team" | "stats";

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

function getVisibleRoleOptions(
  language: AuthLanguage,
  user: AuthUser,
): StoreJobRoleOption[] {
  const options = STORE_JOB_ROLE_OPTIONS[language];

  // Holding/admins may assign any role; everyone else (store/regional managers)
  // can only assign the line-staff roles the backend accepts — offering
  // management roles to them would just get a 403 on save.
  if (canManageHoldingRole(user)) {
    return options;
  }

  const assignable = new Set(STORE_ASSIGNABLE_JOB_ROLE_VALUES);

  return options.filter((option) => assignable.has(option.value));
}

function getUsersForStore(
  users: MobilePermissionUser[],
  storeId: number,
): MobilePermissionUser[] {
  return users.filter((user) => user.restaurant?.id === storeId);
}

function parseRoleValues(jobRole: string | null | undefined): string[] {
  return `${jobRole || ""}`
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
}

// Label the *applied* position using the full role table (incl. 前厅/后厨/经理),
// not the filtered assignable options the selector renders.
function formatAppliedRoleLabel(
  jobRole: string | null | undefined,
  language: AuthLanguage,
): string {
  const options = STORE_JOB_ROLE_OPTIONS[language];
  const labels = parseRoleValues(jobRole).map(
    (value) => options.find((option) => option.value === value)?.label || value,
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

  return `${user.name || ""} ${user.email || ""}`
    .toLowerCase()
    .includes(normalizedSearch);
}

function userHasRole(user: MobilePermissionUser, roleValue: string): boolean {
  if (!roleValue) return true;

  return parseRoleValues(user.jobRole).includes(roleValue);
}

export function StoresModuleScreen({ language, user }: StoresModuleScreenProps) {
  const confirm = useConfirm();
  const toast = useToast();
  const copy = STORE_COPY[language];
  const roleOptions = useMemo(
    () => getVisibleRoleOptions(language, user),
    [language, user],
  );
  const [data, setData] = useState<StoresState>({ stores: [], users: [] });
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [detailView, setDetailView] = useState<StoreDetailView>("overview");
  const [approvalDrafts, setApprovalDrafts] = useState<Record<number, StoreApprovalDraft>>({});
  const [teamDrafts, setTeamDrafts] = useState<Record<number, StoreTeamDraft>>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [reviewingUserId, setReviewingUserId] = useState<number | null>(null);
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [teamSearchTerm, setTeamSearchTerm] = useState("");
  const [teamRoleFilter, setTeamRoleFilter] = useState("");

  const selectedStore =
    data.stores.find((store) => store.id === selectedStoreId) || null;
  const selectedStoreUsers = selectedStore
    ? getUsersForStore(data.users, selectedStore.id)
    : [];
  const pendingUsers = selectedStoreUsers.filter(
    (item) => item.accountStatus === "pending",
  );
  const teamUsers = selectedStoreUsers.filter(
    (item) => item.accountStatus === "approved",
  );
  const activeStoreUsers = selectedStoreUsers.filter(
    (item) => item.accountStatus === "pending" || item.accountStatus === "approved",
  );
  const filteredTeamUsers = teamUsers.filter(
    (item) =>
      userMatchesSearch(item, teamSearchTerm) &&
      userHasRole(item, teamRoleFilter),
  );
  const roleStats = roleOptions.map((roleOption) => ({
    ...roleOption,
    count: activeStoreUsers.filter((item) =>
      parseRoleValues(item.jobRole).includes(roleOption.value),
    ).length,
  }));

  useEffect(() => {
    let isCancelled = false;

    async function loadStores(): Promise<void> {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [stores, users] = await Promise.all([
          fetchManageableStores(),
          fetchApprovableUsers(),
        ]);

        if (isCancelled) return;

        setData({ stores, users });
        setApprovalDrafts(buildApprovalDrafts(users));
        setTeamDrafts(buildTeamDrafts(users));
      } catch (error) {
        if (isCancelled) return;

        setData({ stores: [], users: [] });
        setErrorMessage(
          error instanceof Error && error.message === "INSUFFICIENT_PERMISSIONS"
            ? copy.unavailable
            : copy.error,
        );
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadStores();

    return () => {
      isCancelled = true;
    };
  }, [copy.error, copy.unavailable]);

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
      const updatedUser = await updateUserApproval(
        permissionUser.id,
        accountStatus,
        accountStatus === "approved"
          ? {
              restaurantId: selectedStore.id,
              jobRole: draft.jobRole,
            }
          : {},
      );

      setData((current) => ({
        ...current,
        users: upsertUser(current.users, updatedUser),
      }));
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

      setData((current) => ({
        ...current,
        users: upsertUser(current.users, updatedUser),
      }));
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

  async function deleteTeamUser(permissionUser: MobilePermissionUser): Promise<void> {
    setDeletingUserId(permissionUser.id);
    setErrorMessage("");

    try {
      const updatedUser = await updateUserApproval(permissionUser.id, "rejected");

      setData((current) => ({
        ...current,
        users: upsertUser(current.users, updatedUser),
      }));
      setTeamDrafts((current) => {
        const nextDrafts = { ...current };
        delete nextDrafts[permissionUser.id];
        return nextDrafts;
      });
      toast.success(copy.employeeDeleted);
    } catch {
      toast.error(copy.employeeDeleteError);
    } finally {
      setDeletingUserId(null);
    }
  }

  async function confirmDeleteTeamUser(
    permissionUser: MobilePermissionUser,
  ): Promise<void> {
    const confirmed = await confirm({
      title: copy.deleteEmployeeTitle,
      message: copy.deleteEmployeeBody,
      confirmLabel: copy.deleteConfirm,
      cancelLabel: copy.deleteCancel,
      tone: "danger",
    });
    if (confirmed) {
      void deleteTeamUser(permissionUser);
    }
  }

  function openStore(storeId: number): void {
    setSelectedStoreId(storeId);
    setDetailView("overview");
    setTeamSearchTerm("");
    setTeamRoleFilter("");
    setErrorMessage("");
  }

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

        {errorMessage ? <Text style={styles.message}>{errorMessage}</Text> : null}

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
                  appliedRoleLabel={formatAppliedRoleLabel(item.jobRole, language)}
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
                style={[
                  styles.filterPill,
                  !teamRoleFilter ? styles.filterPillActive : null,
                ]}
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
                    style={[
                      styles.filterPill,
                      isActive ? styles.filterPillActive : null,
                    ]}
                    onPress={() => setTeamRoleFilter(roleOption.value)}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        isActive ? styles.filterPillTextActive : null,
                      ]}
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
                  isDeleting={deletingUserId === item.id}
                  isSaving={savingUserId === item.id}
                  roleOptions={roleOptions}
                  user={item}
                  onDelete={() => void confirmDeleteTeamUser(item)}
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

      {!isLoading && errorMessage ? <Text style={styles.message}>{errorMessage}</Text> : null}

      {!isLoading && !errorMessage && data.stores.length === 0 ? (
        <Text style={styles.emptyText}>{copy.empty}</Text>
      ) : null}

      {!isLoading && !errorMessage && data.stores.length > 0 ? (
        <View style={styles.list}>
          {data.stores.map((store) => {
            const storeUsers = getUsersForStore(data.users, store.id);
            const pendingCount = storeUsers.filter(
              (item) => item.accountStatus === "pending",
            ).length;
            const teamCount = storeUsers.filter(
              (item) => item.accountStatus === "approved",
            ).length;

            return (
              <StoreCard
                key={store.id}
                copy={copy}
                pendingCount={pendingCount}
                store={store}
                teamCount={teamCount}
                onPress={() => openStore(store.id)}
              />
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
