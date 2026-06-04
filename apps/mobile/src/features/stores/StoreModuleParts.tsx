import { Image, Pressable, Text, View } from "react-native";
import { ZhaoLoadingIndicator } from "@/components/ZhaoLoadingIndicator";
import { authControlStyles, TrackingText } from "@/features/auth/AuthFormControls";
import { STORE_COPY } from "@/features/stores/storeCopy";
import { storeStyles as styles } from "@/features/stores/storeStyles";
import type {
  MobilePermissionUser,
  MobileStore,
  StoreApprovalDraft,
  StoreJobRoleOption,
  StoreTeamDraft,
} from "@/features/stores/storeTypes";

function parseRoleValues(jobRole: string | null | undefined): string[] {
  return `${jobRole || ""}`
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
}

function getRoleLabel(
  jobRole: string | null | undefined,
  roleOptions: StoreJobRoleOption[],
): string {
  const roleValues = parseRoleValues(jobRole);
  if (roleValues.length === 0) return "-";

  return roleValues
    .map((role) => roleOptions.find((option) => option.value === role)?.label || role)
    .join(" / ");
}

function resolveStatusLabel(status: string | null | undefined, copy: typeof STORE_COPY.zh): string {
  if (status === "approved") return copy.statusApproved;
  if (status === "pending") return copy.statusPending;
  if (status === "rejected") return copy.statusRejected;

  return status || "-";
}

export function RoleMultiSelector({
  disabled,
  options,
  value,
  onChange,
}: {
  disabled?: boolean;
  options: StoreJobRoleOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const selectedValues = parseRoleValues(value);

  function toggleRole(roleValue: string): void {
    if (disabled) return;

    const nextValues = selectedValues.includes(roleValue)
      ? selectedValues.filter((currentValue) => currentValue !== roleValue)
      : [...selectedValues, roleValue];

    onChange(nextValues.join(","));
  }

  return (
    <View style={styles.roleGrid}>
      {options.map((option) => {
        const isActive = selectedValues.includes(option.value);

        return (
          <Pressable
            key={option.value}
            disabled={disabled}
            style={[styles.rolePill, isActive ? styles.rolePillActive : null]}
            onPress={() => toggleRole(option.value)}
          >
            <Text
              style={[
                styles.rolePillText,
                isActive ? styles.rolePillTextActive : null,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function StoreDetailActionCard({
  count,
  label,
  hint,
  onPress,
}: {
  count: number;
  label: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.detailActionCard} onPress={onPress}>
      <View style={styles.detailActionContent}>
        <Text style={styles.detailActionLabel}>{label}</Text>
        <Text style={styles.cardMeta}>{hint}</Text>
      </View>
      <Text style={styles.detailActionCount}>{count}</Text>
    </Pressable>
  );
}

export function StoreCard({
  copy,
  pendingCount,
  store,
  teamCount,
  onPress,
}: {
  copy: typeof STORE_COPY.zh;
  pendingCount: number;
  store: MobileStore;
  teamCount: number;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardImage}>
        {store.photoUri ? (
          <Image source={{ uri: store.photoUri }} style={styles.cardImageMedia} />
        ) : (
          <Text style={styles.cardImageText}>{copy.imageFallback}</Text>
        )}
      </View>
      <View style={styles.cardBody}>
        <TrackingText color={authControlStyles.colors.red} size={10}>
          {store.storeCode}
        </TrackingText>
        <Text style={styles.cardName}>{store.name}</Text>
        <Text style={styles.cardMeta}>{store.address || "-"}</Text>
      </View>
      <View style={styles.cardStats}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>{copy.pending}</Text>
          <Text style={styles.statValue}>{pendingCount}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>{copy.team}</Text>
          <Text style={styles.statValue}>{teamCount}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export function PendingUserCard({
  copy,
  draft,
  isReviewing,
  roleOptions,
  user,
  onPatchDraft,
  onReview,
}: {
  copy: typeof STORE_COPY.zh;
  draft: StoreApprovalDraft;
  isReviewing: boolean;
  roleOptions: StoreJobRoleOption[];
  user: MobilePermissionUser;
  onPatchDraft: (jobRole: string) => void;
  onReview: (status: "approved" | "rejected") => void;
}) {
  return (
    <View style={styles.userCard}>
      <View>
        <Text style={styles.userName}>{user.name || "-"}</Text>
        <Text style={styles.userEmail}>{user.email || "-"}</Text>
        <Text style={styles.cardMeta}>
          {resolveStatusLabel(user.accountStatus, copy)}
        </Text>
      </View>
      <RoleMultiSelector
        disabled={isReviewing}
        options={roleOptions}
        value={draft.jobRole}
        onChange={onPatchDraft}
      />
      <View style={styles.actionRow}>
        <Pressable
          disabled={isReviewing || !draft.jobRole}
          style={[
            styles.actionButton,
            styles.actionButtonPrimary,
            isReviewing || !draft.jobRole ? { opacity: 0.56 } : null,
          ]}
          onPress={() => onReview("approved")}
        >
          {isReviewing ? (
            <ZhaoLoadingIndicator tone="light" variant="button" />
          ) : (
            <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>
              {copy.approve}
            </Text>
          )}
        </Pressable>
        <Pressable
          disabled={isReviewing}
          style={[styles.actionButton, styles.actionButtonDanger]}
          onPress={() => onReview("rejected")}
        >
          <Text style={styles.actionButtonText}>{copy.reject}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function TeamUserCard({
  copy,
  draft,
  isSaving,
  isDeleting,
  roleOptions,
  user,
  onDelete,
  onPatchDraft,
  onSave,
}: {
  copy: typeof STORE_COPY.zh;
  draft: StoreTeamDraft;
  isDeleting: boolean;
  isSaving: boolean;
  roleOptions: StoreJobRoleOption[];
  user: MobilePermissionUser;
  onDelete: () => void;
  onPatchDraft: (jobRole: string) => void;
  onSave: () => void;
}) {
  const hasChanged = draft.jobRole !== (user.jobRole || "");

  return (
    <View style={styles.userCard}>
      <View>
        <Text style={styles.userName}>{user.name || "-"}</Text>
        <Text style={styles.userEmail}>{user.email || "-"}</Text>
        <Text style={styles.cardMeta}>{getRoleLabel(user.jobRole, roleOptions)}</Text>
      </View>
      <RoleMultiSelector
        disabled={isSaving || isDeleting}
        options={roleOptions}
        value={draft.jobRole}
        onChange={onPatchDraft}
      />
      <View style={styles.actionRow}>
        <Pressable
          disabled={isSaving || isDeleting || !draft.jobRole || !hasChanged}
          style={[
            styles.actionButton,
            styles.actionButtonPrimary,
            isSaving || isDeleting || !draft.jobRole || !hasChanged
              ? { opacity: 0.56 }
              : null,
          ]}
          onPress={onSave}
        >
          {isSaving ? (
            <ZhaoLoadingIndicator tone="light" variant="button" />
          ) : (
            <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>
              {copy.saveRole}
            </Text>
          )}
        </Pressable>
        <Pressable
          disabled={isSaving || isDeleting}
          style={[
            styles.actionButton,
            styles.actionButtonDanger,
            isSaving || isDeleting ? { opacity: 0.56 } : null,
          ]}
          onPress={onDelete}
        >
          {isDeleting ? (
            <ZhaoLoadingIndicator variant="button" />
          ) : (
            <Text style={styles.actionButtonText}>{copy.deleteEmployee}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
