import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { AuthUser } from "@zhao/types";
import { useToast } from "@/components/toast/ToastProvider";
import { ZhaoLoadingIndicator } from "@/components/ZhaoLoadingIndicator";
import { TrackingText, authControlStyles } from "@/features/auth/AuthFormControls";
import type { AuthLanguage } from "@/features/auth/authCopy";
import { INVITE_PARTNER_COPY } from "@/features/stores/storeCopy";
import { getStoreManagerInvitationRoleOptions } from "@/features/stores/invitationRoleOptions";
import { fetchTrainingPositions, sendEmployeeInvitation } from "@/features/stores/storeApi";
import { storeStyles as styles } from "@/features/stores/storeStyles";
import type { TrainingPositionOption } from "@/features/stores/storeTypes";
import { useScreenName } from "@/lib/useScreenName";
import { triggerSuccessFeedback } from "@/lib/useOperationFeedback";

type InvitePartnerScreenProps = {
  language: AuthLanguage;
  user: AuthUser;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function getInvitationErrorMessage(error: unknown, copy: typeof INVITE_PARTNER_COPY.zh): string {
  if (!(error instanceof Error)) return copy.error;

  if (error.message === "INVITATION_EMAIL_ALREADY_EXISTS") {
    return copy.errorEmailExists;
  }

  if (error.message === "INSUFFICIENT_PERMISSIONS") {
    return copy.errorPermission;
  }

  return copy.error;
}

export function InvitePartnerScreen({ language, user }: InvitePartnerScreenProps) {
  useScreenName("invite-partner");
  const toast = useToast();
  const copy = INVITE_PARTNER_COPY[language];
  const [email, setEmail] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [trainingPositions, setTrainingPositions] = useState<TrainingPositionOption[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const roleOptions = useMemo(
    () => getStoreManagerInvitationRoleOptions(language, trainingPositions),
    [language, trainingPositions],
  );

  useEffect(() => {
    let isCancelled = false;

    async function loadTrainingPositions(): Promise<void> {
      try {
        const positions = await fetchTrainingPositions();
        if (!isCancelled) {
          setTrainingPositions(positions);
        }
      } catch {
        if (!isCancelled) {
          toast.error(copy.error);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingRoles(false);
        }
      }
    }

    void loadTrainingPositions();

    return () => {
      isCancelled = true;
    };
  }, [copy.error, toast]);

  async function handleSubmit(): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setFormError(copy.emailInvalid);
      return;
    }

    if (!jobRole) {
      setFormError(copy.roleRequired);
      return;
    }

    setFormError("");
    setIsSubmitting(true);

    try {
      await sendEmployeeInvitation({
        email: normalizedEmail,
        jobRole,
        language,
      });
      setEmail("");
      setJobRole("");
      toast.success(copy.success);
      triggerSuccessFeedback();
    } catch (error) {
      const message = getInvitationErrorMessage(error, copy);
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TrackingText color={authControlStyles.colors.red} size={10.5}>
          {copy.titleKicker}
        </TrackingText>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.hint}>{copy.hint}</Text>
        <Text style={styles.invitationStore}>{user.store?.name || user.storeName}</Text>
      </View>

      <View style={styles.invitationForm}>
        <View style={styles.invitationField}>
          <TrackingText size={10.5}>{copy.email}</TrackingText>
          <TextInput
            accessibilityLabel={copy.email}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder={copy.emailPlaceholder}
            placeholderTextColor={authControlStyles.colors.ink20}
            style={styles.searchInput}
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setFormError("");
            }}
          />
        </View>

        <View style={styles.invitationField}>
          <TrackingText size={10.5}>{copy.role}</TrackingText>
          {isLoadingRoles ? (
            <View style={styles.invitationLoadingRow}>
              <ZhaoLoadingIndicator variant="button" />
              <Text style={styles.cardMeta}>{copy.loadingRoles}</Text>
            </View>
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              style={styles.invitationRoleList}
            >
              {roleOptions.map((option) => {
                const isSelected = jobRole === option.value;

                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    style={styles.invitationRoleOption}
                    onPress={() => {
                      setJobRole(option.value);
                      setFormError("");
                    }}
                  >
                    <Text
                      style={[
                        styles.invitationRoleLabel,
                        isSelected ? styles.invitationRoleLabelSelected : null,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text style={styles.invitationRoleCheck}>{isSelected ? "●" : "○"}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        {formError ? <Text style={styles.message}>{formError}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting || isLoadingRoles}
          style={[
            styles.invitationSubmit,
            isSubmitting || isLoadingRoles ? styles.invitationSubmitDisabled : null,
          ]}
          onPress={() => void handleSubmit()}
        >
          {isSubmitting ? (
            <ZhaoLoadingIndicator tone="light" variant="button" />
          ) : (
            <Text style={styles.actionButtonTextPrimary}>{copy.send}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
