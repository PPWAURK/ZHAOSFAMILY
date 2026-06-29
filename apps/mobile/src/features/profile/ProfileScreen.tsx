import { useEffect, useMemo, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import {
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { scaleStyles } from "@/lib/responsive";
import { useScreenName } from "@/lib/useScreenName";
import type { AuthUser, ChangePasswordRequest, UpdateMeRequest } from "@zhao/types";
import { ZhaoLoadingIndicator } from "@/components/ZhaoLoadingIndicator";
import { TrackingText, authControlStyles } from "@/features/auth/AuthFormControls";
import type { AuthLanguage } from "@/features/auth/authCopy";
import { LANGUAGE_OPTIONS } from "@/features/auth/authCopy";
import { PROFILE_COPY } from "@/features/profile/profileCopy";

const ACCOUNT_DELETION_URL = "https://zhaoplatforme.com/delete-account";

type ProfileScreenProps = {
  language: AuthLanguage;
  user: AuthUser;
  onChangeLanguage: (language: AuthLanguage) => void;
  onLogout: () => Promise<void>;
  onChangePassword: (input: ChangePasswordRequest) => Promise<void>;
  onUpdateProfile: (input: UpdateMeRequest) => Promise<void>;
};

type ProfileField = {
  label: string;
  value: string;
};

type ContactDraft = {
  address: string;
  phone: string;
};

type PasswordDraft = {
  currentPassword: string;
  nextPassword: string;
};

function resolveDisplayName(user: AuthUser, fallback: string): string {
  const composedName = [user.familyName || user.lastName, user.givenName || user.firstName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return composedName || user.name?.trim() || fallback;
}

function resolveStoreName(user: AuthUser, fallback: string): string {
  return user.store?.name || user.storeName || user.establishment || fallback;
}

function resolveRole(user: AuthUser, fallback: string): string {
  return user.jobRole || user.position || user.role || fallback;
}

function resolveInitials(name: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return initials || "Z";
}

function buildContactDraft(user: AuthUser): ContactDraft {
  return {
    address: user.address || "",
    phone: user.phone || "",
  };
}

function ProfileFieldList({ fields }: { fields: ProfileField[] }) {
  return (
    <View style={styles.fieldList}>
      {fields.map((field) => (
        <View key={field.label} style={styles.fieldRow}>
          <TrackingText size={10}>{field.label}</TrackingText>
          <Text style={styles.fieldValue}>{field.value}</Text>
        </View>
      ))}
    </View>
  );
}

export function ProfileScreen({
  language,
  user,
  onChangeLanguage,
  onLogout,
  onChangePassword,
  onUpdateProfile,
}: ProfileScreenProps) {
  useScreenName("profile");
  const copy = PROFILE_COPY[language];
  const displayName = useMemo(() => resolveDisplayName(user, copy.noValue), [copy.noValue, user]);
  const [avatar, setAvatar] = useState(user.avatarUrl || user.avatar || null);
  const [contact, setContact] = useState<ContactDraft>(() => buildContactDraft(user));
  const [draft, setDraft] = useState<ContactDraft>(() => buildContactDraft(user));
  const [passwordDraft, setPasswordDraft] = useState<PasswordDraft>({
    currentPassword: "",
    nextPassword: "",
  });
  const [isChangingAvatar, setIsChangingAvatar] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState("");
  const [dataRequestError, setDataRequestError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [showSaved, setShowSaved] = useState(false);

  const identityFields = useMemo(
    () => [
      { label: copy.name, value: displayName },
      { label: copy.email, value: user.email || copy.noValue },
      { label: copy.store, value: resolveStoreName(user, copy.noValue) },
      { label: copy.role, value: resolveRole(user, copy.noValue) },
      { label: copy.status, value: user.accountStatus || copy.noValue },
    ],
    [copy, displayName, user],
  );

  useEffect(() => {
    const nextContact = buildContactDraft(user);

    setAvatar(user.avatarUrl || user.avatar || null);
    setContact(nextContact);
    setDraft(nextContact);
  }, [user]);

  function startEditing(): void {
    setDraft(contact);
    setSaveError("");
    setShowSaved(false);
    setIsEditing(true);
  }

  function cancelEditing(): void {
    setDraft(contact);
    setSaveError("");
    setIsEditing(false);
  }

  async function saveContact(): Promise<void> {
    setIsSaving(true);
    setSaveError("");

    try {
      await onUpdateProfile({
        address: draft.address.trim(),
        phone: draft.phone.trim(),
      });
      const nextContact = {
        address: draft.address.trim(),
        phone: draft.phone.trim(),
      };

      setContact(nextContact);
      setDraft(nextContact);
      setIsEditing(false);
      setShowSaved(true);
    } catch {
      setSaveError(copy.updateError);
    } finally {
      setIsSaving(false);
    }
  }

  async function changeAvatar(): Promise<void> {
    setAvatarMessage("");
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setAvatarMessage(copy.avatarError);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      base64: true,
      mediaTypes: "images",
      quality: 0.72,
    });

    if (result.canceled || !result.assets[0]?.base64) {
      return;
    }

    const asset = result.assets[0];
    const mimeType = asset.mimeType || "image/jpeg";
    const profilePhotoDataUrl = `data:${mimeType};base64,${asset.base64}`;

    setIsChangingAvatar(true);

    try {
      await onUpdateProfile({ profilePhotoDataUrl });
      setAvatar(profilePhotoDataUrl);
      setAvatarMessage(copy.avatarSaved);
    } catch {
      setAvatarMessage(copy.avatarError);
    } finally {
      setIsChangingAvatar(false);
    }
  }

  async function savePassword(): Promise<void> {
    const currentPassword = passwordDraft.currentPassword;
    const nextPassword = passwordDraft.nextPassword;

    setPasswordMessage("");

    if (nextPassword.length < 8) {
      setPasswordMessage(copy.passwordTooShort);
      return;
    }

    if (currentPassword === nextPassword) {
      setPasswordMessage(copy.passwordMismatch);
      return;
    }

    setIsChangingPassword(true);

    try {
      await onChangePassword({ currentPassword, nextPassword });
      setPasswordDraft({ currentPassword: "", nextPassword: "" });
      setPasswordMessage(copy.passwordChanged);
    } catch {
      setPasswordMessage(copy.passwordError);
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function handleLogoutPress(): Promise<void> {
    setIsLoggingOut(true);

    try {
      await onLogout();
    } finally {
      setIsLoggingOut(false);
    }
  }

  async function openAccountDeletionPage(): Promise<void> {
    setDataRequestError("");

    try {
      await Linking.openURL(ACCOUNT_DELETION_URL);
    } catch {
      setDataRequestError(copy.dataRequestError);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatarImage} resizeMode="cover" />
          ) : (
            <Text style={styles.avatarInitials}>{resolveInitials(displayName)}</Text>
          )}
        </View>
        <View style={styles.heroText}>
          <TrackingText color={authControlStyles.colors.red} size={10.5}>
            ZHAO · PROFILE
          </TrackingText>
          <Text style={styles.title}>
            {copy.title}
            <Text style={styles.titleAccent}>{copy.titleAccent}</Text>
            {copy.titleSuffix}
          </Text>
          <Text style={styles.heroName}>{displayName}</Text>
          <Pressable
            disabled={isChangingAvatar}
            style={styles.avatarButton}
            onPress={() => void changeAvatar()}
          >
            {isChangingAvatar ? (
              <ZhaoLoadingIndicator variant="button" />
            ) : (
              <Text style={styles.avatarButtonText}>{copy.avatarAction}</Text>
            )}
          </Pressable>
          {avatarMessage ? <Text style={styles.inlineMessage}>{avatarMessage}</Text> : null}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleGroup}>
            <Text style={styles.sectionTitle}>{copy.identityHeading}</Text>
            <Text style={styles.sectionHint}>{copy.identityHint}</Text>
          </View>
        </View>
        <ProfileFieldList fields={identityFields} />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleGroup}>
            <Text style={styles.sectionTitle}>{copy.contactHeading}</Text>
            <Text style={styles.sectionHint}>{copy.contactHint}</Text>
          </View>
          {!isEditing ? (
            <Pressable style={styles.ghostButton} onPress={startEditing}>
              <Text style={styles.ghostButtonText}>{copy.edit}</Text>
            </Pressable>
          ) : null}
        </View>

        {isEditing ? (
          <View style={styles.fieldList}>
            <View style={styles.editField}>
              <TrackingText size={10}>{copy.phone}</TrackingText>
              <TextInput
                keyboardType="phone-pad"
                placeholder={copy.noValue}
                placeholderTextColor={authControlStyles.colors.ink20}
                style={styles.input}
                value={draft.phone}
                onChangeText={(phone) => setDraft((current) => ({ ...current, phone }))}
              />
            </View>
            <View style={styles.editField}>
              <TrackingText size={10}>{copy.address}</TrackingText>
              <TextInput
                placeholder={copy.noValue}
                placeholderTextColor={authControlStyles.colors.ink20}
                style={styles.input}
                value={draft.address}
                onChangeText={(address) => setDraft((current) => ({ ...current, address }))}
              />
            </View>
            {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
            <View style={styles.buttonRow}>
              <Pressable
                disabled={isSaving}
                style={[styles.primaryButton, isSaving ? styles.disabledButton : null]}
                onPress={() => void saveContact()}
              >
                {isSaving ? (
                  <ZhaoLoadingIndicator tone="light" variant="button" />
                ) : (
                  <Text style={styles.primaryButtonText}>{copy.save}</Text>
                )}
              </Pressable>
              <Pressable disabled={isSaving} style={styles.secondaryButton} onPress={cancelEditing}>
                <Text style={styles.secondaryButtonText}>{copy.cancel}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <ProfileFieldList
              fields={[
                { label: copy.phone, value: contact.phone || copy.noValue },
                { label: copy.address, value: contact.address || copy.noValue },
              ]}
            />
            {showSaved ? <Text style={styles.savedText}>{copy.saved}</Text> : null}
          </>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleGroup}>
            <Text style={styles.sectionTitle}>{copy.preferencesHeading}</Text>
            <Text style={styles.sectionHint}>{copy.preferencesHint}</Text>
          </View>
        </View>
        <View style={styles.languageGrid}>
          {LANGUAGE_OPTIONS.map((option) => {
            const isActive = option.value === language;

            return (
              <Pressable
                key={option.value}
                style={[styles.languageButton, isActive ? styles.languageButtonActive : null]}
                onPress={() => onChangeLanguage(option.value)}
              >
                <Text
                  style={[
                    styles.languageButtonText,
                    isActive ? styles.languageButtonTextActive : null,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{copy.accountHeading}</Text>
        <Text style={styles.sectionHint}>{copy.accountHint}</Text>
        <View style={styles.fieldList}>
          <View style={styles.editField}>
            <TrackingText size={10}>{copy.currentPassword}</TrackingText>
            <TextInput
              placeholder="••••••••"
              placeholderTextColor={authControlStyles.colors.ink20}
              secureTextEntry
              style={styles.input}
              value={passwordDraft.currentPassword}
              onChangeText={(currentPassword) =>
                setPasswordDraft((current) => ({ ...current, currentPassword }))
              }
            />
          </View>
          <View style={styles.editField}>
            <TrackingText size={10}>{copy.newPassword}</TrackingText>
            <TextInput
              placeholder="••••••••"
              placeholderTextColor={authControlStyles.colors.ink20}
              secureTextEntry
              style={styles.input}
              value={passwordDraft.nextPassword}
              onChangeText={(nextPassword) =>
                setPasswordDraft((current) => ({ ...current, nextPassword }))
              }
            />
          </View>
        </View>
        {passwordMessage ? <Text style={styles.inlineMessage}>{passwordMessage}</Text> : null}
        <Pressable
          disabled={
            isChangingPassword ||
            !passwordDraft.currentPassword ||
            !passwordDraft.nextPassword
          }
          style={[
            styles.primaryButton,
            isChangingPassword ||
            !passwordDraft.currentPassword ||
            !passwordDraft.nextPassword
              ? styles.disabledButton
              : null,
          ]}
          onPress={() => void savePassword()}
        >
          {isChangingPassword ? (
            <ZhaoLoadingIndicator tone="light" variant="button" />
          ) : (
            <Text style={styles.primaryButtonText}>{copy.save}</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleGroup}>
            <Text style={styles.sectionTitle}>{copy.dataRequestHeading}</Text>
            <Text style={styles.sectionHint}>{copy.dataRequestHint}</Text>
          </View>
        </View>
        <Pressable style={styles.linkButton} onPress={() => void openAccountDeletionPage()}>
          <Text style={styles.linkButtonText}>{copy.dataRequestAction}</Text>
        </Pressable>
        {dataRequestError ? <Text style={styles.inlineMessage}>{dataRequestError}</Text> : null}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleGroup}>
            <Text style={styles.sectionTitle}>{copy.logoutHeading}</Text>
            <Text style={styles.sectionHint}>{copy.logoutHint}</Text>
          </View>
        </View>
        <Pressable
          disabled={isLoggingOut}
          style={[styles.logoutButton, isLoggingOut ? styles.disabledButton : null]}
          onPress={() => void handleLogoutPress()}
        >
          {isLoggingOut ? (
            <ZhaoLoadingIndicator variant="button" />
          ) : (
            <Text style={styles.logoutButtonText}>{copy.logout}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create(scaleStyles({
  avatar: {
    alignItems: "center",
    backgroundColor: "rgba(193, 22, 22, 0.08)",
    borderColor: "rgba(193, 22, 22, 0.26)",
    borderWidth: 1,
    height: 74,
    justifyContent: "center",
    overflow: "hidden",
    width: 74,
  },
  avatarImage: {
    height: "100%",
    width: "100%",
  },
  avatarInitials: {
    color: authControlStyles.colors.red,
    fontFamily: "serif",
    fontSize: 26,
    fontWeight: "700",
  },
  avatarButton: {
    alignItems: "center",
    borderColor: "rgba(193, 22, 22, 0.28)",
    borderWidth: 1,
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 12,
    alignSelf: "flex-start",
  },
  avatarButtonText: {
    color: authControlStyles.colors.red,
    fontFamily: "monospace",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  container: {
    gap: 18,
    paddingTop: 22,
  },
  disabledButton: {
    opacity: 0.58,
  },
  editField: {
    gap: 8,
  },
  errorText: {
    color: authControlStyles.colors.red,
    fontFamily: "serif",
    fontSize: 13,
    lineHeight: 19,
  },
  fieldList: {
    borderTopColor: authControlStyles.colors.ink10,
    borderTopWidth: 1,
  },
  fieldRow: {
    borderBottomColor: authControlStyles.colors.ink10,
    borderBottomWidth: 1,
    gap: 7,
    paddingVertical: 14,
  },
  fieldValue: {
    color: authControlStyles.colors.ink,
    fontFamily: "serif",
    fontSize: 17,
    lineHeight: 23,
  },
  ghostButton: {
    borderColor: "rgba(193, 22, 22, 0.28)",
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 14,
  },
  ghostButtonText: {
    color: authControlStyles.colors.red,
    fontFamily: "monospace",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
  },
  hero: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
  },
  heroName: {
    color: authControlStyles.colors.ink60,
    fontFamily: "serif",
    fontSize: 15,
    lineHeight: 21,
  },
  heroText: {
    flex: 1,
    gap: 6,
  },
  input: {
    borderColor: "rgba(193, 22, 22, 0.22)",
    borderWidth: 1,
    color: authControlStyles.colors.ink,
    fontFamily: "serif",
    fontSize: 17,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  inlineMessage: {
    color: authControlStyles.colors.red,
    fontFamily: "serif",
    fontSize: 13,
    lineHeight: 19,
  },
  languageButton: {
    alignItems: "center",
    borderColor: authControlStyles.colors.ink10,
    borderWidth: 1,
    flex: 1,
    minHeight: 42,
    justifyContent: "center",
  },
  languageButtonActive: {
    backgroundColor: "rgba(193, 22, 22, 0.08)",
    borderColor: "rgba(193, 22, 22, 0.38)",
  },
  languageButtonText: {
    color: authControlStyles.colors.ink40,
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  languageButtonTextActive: {
    color: authControlStyles.colors.red,
  },
  languageGrid: {
    flexDirection: "row",
    gap: 8,
  },
  linkButton: {
    alignItems: "center",
    borderColor: "rgba(193, 22, 22, 0.28)",
    borderWidth: 1,
    minHeight: 46,
    justifyContent: "center",
  },
  linkButtonText: {
    color: authControlStyles.colors.red,
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  logoutButton: {
    alignItems: "center",
    borderColor: "rgba(193, 22, 22, 0.42)",
    borderWidth: 1,
    minHeight: 50,
    justifyContent: "center",
  },
  logoutButtonText: {
    color: authControlStyles.colors.red,
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: authControlStyles.colors.red,
    flex: 1,
    minHeight: 46,
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  savedText: {
    color: authControlStyles.colors.success,
    fontFamily: "serif",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: authControlStyles.colors.ink10,
    borderWidth: 1,
    flex: 1,
    minHeight: 46,
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: authControlStyles.colors.ink60,
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  section: {
    backgroundColor: "#ffffff",
    borderColor: authControlStyles.colors.ink10,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  sectionHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  sectionHint: {
    color: authControlStyles.colors.ink60,
    fontFamily: "serif",
    fontSize: 13,
    lineHeight: 20,
  },
  sectionTitle: {
    color: authControlStyles.colors.ink,
    fontFamily: "serif",
    fontSize: 21,
    fontWeight: "600",
    lineHeight: 25,
  },
  sectionTitleGroup: {
    flex: 1,
    gap: 5,
  },
  title: {
    color: authControlStyles.colors.ink,
    fontFamily: "serif",
    fontSize: 34,
    fontWeight: "500",
    lineHeight: 39,
  },
  titleAccent: {
    color: authControlStyles.colors.red,
    fontStyle: "italic",
    fontWeight: "400",
  },
}));
