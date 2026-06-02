import { useMemo, useState, type ReactElement } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  AuthTextField,
  FeedbackMessage,
  PrimaryButton,
  TopIndex,
  TrackingText,
  authControlStyles,
} from "@/features/auth/AuthFormControls";
import type { AuthCopy, AuthLanguage } from "@/features/auth/authCopy";
import { AUTH_COPY } from "@/features/auth/authCopy";
import zhaoLogo from "@/features/auth/assets/logo2024竖版.jpg";
import { mobileAuthApi } from "@/lib/api";

const RESET_COPY: Record<
  AuthLanguage,
  {
    activeStage: string;
    kicker: string;
    title: string;
    subtitle: string;
    passwordLabel: string;
    confirmLabel: string;
    show: string;
    hide: string;
    strength: string;
    waitingStrength: string;
    weakStrength: string;
    mediumStrength: string;
    strongStrength: string;
    submit: string;
    submitting: string;
    success: string;
    missingToken: string;
    shortPassword: string;
    mismatch: string;
    fallbackError: string;
    backToLogin: string;
    notice: string;
  }
> = {
  zh: {
    activeStage: "02 / 重置密码",
    kicker: "安全验证",
    title: "设置新的访问密码。",
    subtitle: "输入新密码后，你可以回到登录页使用它进入平台。",
    passwordLabel: "NEW PASSWORD · 新密码",
    confirmLabel: "CONFIRM PASSWORD · 确认密码",
    show: "显示",
    hide: "隐藏",
    strength: "强度",
    waitingStrength: "等待输入",
    weakStrength: "弱",
    mediumStrength: "中",
    strongStrength: "强",
    submit: "确认更新",
    submitting: "更新中...",
    success: "密码已更新，请返回登录页。",
    missingToken: "重置链接缺少 token，请重新发送邮件。",
    shortPassword: "请输入至少 8 位的新密码。",
    mismatch: "两次输入的密码不一致。",
    fallbackError: "重置链接无效或已过期。",
    backToLogin: "返回登录",
    notice: "邮件链接只用于本次操作，页面不会显示完整链接。",
  },
  en: {
    activeStage: "02 / Reset",
    kicker: "Security check",
    title: "Set a new access password.",
    subtitle: "After the update, return to sign in with your new password.",
    passwordLabel: "NEW PASSWORD",
    confirmLabel: "CONFIRM PASSWORD",
    show: "Show",
    hide: "Hide",
    strength: "Strength",
    waitingStrength: "Waiting",
    weakStrength: "Weak",
    mediumStrength: "Medium",
    strongStrength: "Strong",
    submit: "Update password",
    submitting: "Updating...",
    success: "Password updated. Return to sign in.",
    missingToken: "This reset link is missing a token. Request a new email.",
    shortPassword: "Use at least 8 characters.",
    mismatch: "The two passwords do not match.",
    fallbackError: "This reset link is invalid or expired.",
    backToLogin: "Back to login",
    notice: "The email link is only used for this action and is not shown here.",
  },
  fr: {
    activeStage: "02 / Reinitialiser",
    kicker: "Verification securite",
    title: "Definir un nouveau mot de passe.",
    subtitle: "Une fois modifie, revenez a la connexion avec ce mot de passe.",
    passwordLabel: "NOUVEAU MOT DE PASSE",
    confirmLabel: "CONFIRMER LE MOT DE PASSE",
    show: "Voir",
    hide: "Masquer",
    strength: "Niveau",
    waitingStrength: "En attente",
    weakStrength: "Faible",
    mediumStrength: "Moyen",
    strongStrength: "Fort",
    submit: "Mettre a jour",
    submitting: "Mise a jour...",
    success: "Mot de passe mis a jour. Revenez a la connexion.",
    missingToken: "Le lien ne contient pas de token. Demandez un nouvel email.",
    shortPassword: "Utilisez au moins 8 caracteres.",
    mismatch: "Les deux mots de passe ne correspondent pas.",
    fallbackError: "Ce lien est invalide ou expire.",
    backToLogin: "Retour connexion",
    notice: "Le lien email sert uniquement a cette action et n'est pas affiche ici.",
  },
};

function firstSearchParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function getPasswordStrength(password: string, copy: (typeof RESET_COPY)[AuthLanguage]) {
  if (!password) return { label: copy.waitingStrength, score: 0 };

  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score >= 4) return { label: copy.strongStrength, score };
  if (score >= 2) return { label: copy.mediumStrength, score };
  return { label: copy.weakStrength, score };
}

function resolveLanguage(value: string): AuthLanguage {
  if (value === "en" || value === "fr" || value === "zh") return value;
  return "zh";
}

export function ResetPasswordScreen(): ReactElement {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [language, setLanguage] = useState<AuthLanguage>(() =>
    resolveLanguage(firstSearchParam(params.language)),
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = firstSearchParam(params.token);
  const authCopy = AUTH_COPY[language] as AuthCopy;
  const copy = RESET_COPY[language];
  const strength = useMemo(() => getPasswordStrength(password, copy), [copy, password]);

  function clearFeedback(): void {
    setFeedback(null);
    setSuccessMessage(null);
  }

  async function submitResetPassword(): Promise<void> {
    clearFeedback();

    if (!token) {
      setFeedback(copy.missingToken);
      return;
    }

    if (password.length < 8) {
      setFeedback(copy.shortPassword);
      return;
    }

    if (password !== confirmPassword) {
      setFeedback(copy.mismatch);
      return;
    }

    setIsSubmitting(true);

    try {
      await mobileAuthApi.resetPassword({ token, password });
      setPassword("");
      setConfirmPassword("");
      setSuccessMessage(copy.success);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : copy.fallbackError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          style={styles.scrollView}
        >
          <View style={styles.shell}>
            <TopIndex
              activeStage={copy.activeStage}
              copy={authCopy}
              language={language}
              onChangeLanguage={(nextLanguage) => {
                clearFeedback();
                setLanguage(nextLanguage);
              }}
            />

            <View style={styles.hero}>
              <Image source={zhaoLogo} style={styles.logo} />
              <View style={styles.kickerRow}>
                <View style={styles.kickerDot} />
                <TrackingText>{copy.kicker}</TrackingText>
              </View>
              <Text style={styles.title}>{copy.title}</Text>
              <Text style={styles.subtitle}>{copy.subtitle}</Text>
            </View>

            <View style={styles.form}>
              <AuthTextField
                label={copy.passwordLabel}
                secureTextEntry={!showPassword}
                textContentType="newPassword"
                value={password}
                withTopBorder
                rightAction={
                  <Pressable onPress={() => setShowPassword((current) => !current)}>
                    <Text style={styles.textAction}>{showPassword ? copy.hide : copy.show}</Text>
                  </Pressable>
                }
                onChangeText={(value) => {
                  clearFeedback();
                  setPassword(value);
                }}
              />

              <View style={styles.strengthRow}>
                <TrackingText size={10.5}>{copy.strength}</TrackingText>
                <View style={styles.strengthTrack}>
                  {[1, 2, 3, 4].map((item) => (
                    <View
                      key={item}
                      style={[
                        styles.strengthBar,
                        item <= strength.score ? styles.strengthBarActive : null,
                      ]}
                    />
                  ))}
                </View>
                <Text style={styles.strengthLabel}>{strength.label}</Text>
              </View>

              <AuthTextField
                label={copy.confirmLabel}
                secureTextEntry={!showPassword}
                textContentType="newPassword"
                value={confirmPassword}
                onChangeText={(value) => {
                  clearFeedback();
                  setConfirmPassword(value);
                }}
              />

              {feedback ? <FeedbackMessage tone="error">{feedback}</FeedbackMessage> : null}
              {successMessage ? (
                <FeedbackMessage tone="success">{successMessage}</FeedbackMessage>
              ) : null}

              <PrimaryButton
                disabled={Boolean(successMessage)}
                isLoading={isSubmitting}
                label={isSubmitting ? copy.submitting : copy.submit}
                onPress={submitResetPassword}
              />

              <Pressable style={styles.backButton} onPress={() => router.replace("/")}>
                <Text style={styles.backButtonText}>{copy.backToLogin}</Text>
              </Pressable>
            </View>

            <Text style={styles.notice}>{copy.notice}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    marginTop: 22,
    minHeight: 36,
  },
  backButtonText: {
    borderBottomColor: authControlStyles.colors.ink,
    borderBottomWidth: 1,
    color: authControlStyles.colors.ink,
    fontFamily: "monospace",
    fontSize: 12,
    letterSpacing: 0.6,
    paddingBottom: 2,
  },
  form: {
    marginTop: 28,
  },
  hero: {
    paddingTop: 44,
  },
  keyboardView: {
    flex: 1,
  },
  kickerDot: {
    backgroundColor: authControlStyles.colors.red,
    height: 6,
    width: 6,
  },
  kickerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 30,
  },
  logo: {
    borderRadius: 44,
    height: 88,
    width: 88,
  },
  notice: {
    color: authControlStyles.colors.ink40,
    fontFamily: "serif",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 30,
  },
  safeArea: {
    backgroundColor: authControlStyles.colors.paper,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  scrollView: {
    flex: 1,
  },
  shell: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingBottom: 32,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  strengthBar: {
    backgroundColor: authControlStyles.colors.ink10,
    flex: 1,
    height: 4,
  },
  strengthBarActive: {
    backgroundColor: authControlStyles.colors.red,
  },
  strengthLabel: {
    color: authControlStyles.colors.ink60,
    fontFamily: "monospace",
    fontSize: 11,
    letterSpacing: 0.6,
    minWidth: 54,
    textAlign: "right",
  },
  strengthRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  strengthTrack: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
  },
  subtitle: {
    color: authControlStyles.colors.ink60,
    fontFamily: "serif",
    fontSize: 15,
    lineHeight: 23,
    marginTop: 16,
  },
  textAction: {
    borderBottomColor: authControlStyles.colors.ink,
    borderBottomWidth: 1,
    color: authControlStyles.colors.ink,
    fontFamily: "monospace",
    fontSize: 11,
    letterSpacing: 0.6,
    paddingBottom: 1,
  },
  title: {
    color: authControlStyles.colors.ink,
    fontFamily: "serif",
    fontSize: 46,
    fontWeight: "500",
    lineHeight: 50,
    marginTop: 22,
  },
});
