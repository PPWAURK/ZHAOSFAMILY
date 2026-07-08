import { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { scaleStyles } from "@/lib/responsive";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "zustand";
import type {
  ChangePasswordRequest,
  DeleteAccountRequest,
  RestaurantSummary,
  UpdateMeRequest,
} from "@zhao/types";
import { ZhaoLoadingIndicator } from "@/components/ZhaoLoadingIndicator";
import {
  AuthHeading,
  FeedbackMessage,
  PrimaryButton,
  SwitchLine,
  TopIndex,
  authControlStyles,
} from "@/features/auth/AuthFormControls";
import { DashboardHomeScreen } from "@/features/dashboard/DashboardHomeScreen";
import { LoginForm } from "@/features/auth/LoginForm";
import { RegisterForm, type RegisterFormState } from "@/features/auth/RegisterForm";
import type { AuthCopy, AuthLanguage, AuthMode } from "@/features/auth/authCopy";
import { AUTH_COPY } from "@/features/auth/authCopy";
import { mobileApiClient, mobileAuthActions, mobileAuthApi, mobileAuthStore } from "@/lib/api";
import { secureTokenStorage } from "@/lib/tokenStorage";
import { unregisterPushToken } from "@/lib/pushNotifications";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const initialRegisterForm: RegisterFormState = {
  familyName: "",
  givenName: "",
  email: "",
  password: "",
  birthday: "",
  profilePhotoDataUrl: "",
  restaurantId: null,
  roles: [],
  acceptedTerms: false,
};

function resolveLoginErrorMessage(error: unknown, copy: AuthCopy): string {
  const message = error instanceof Error ? error.message : "";

  if (message === "INVALID_CREDENTIALS") return copy.errors.invalidCredentials;
  if (message === "ACCOUNT_PENDING_APPROVAL") return copy.errors.accountPending;
  if (message === "ACCOUNT_REJECTED") return copy.errors.accountRejected;
  if (message === "Network Error" || message === "HTTP 0") return copy.errors.network;

  return message || copy.errors.loginFallback;
}

function resolveRegisterErrorMessage(error: unknown, copy: AuthCopy): string {
  const message = error instanceof Error ? error.message : "";

  if (message === "EMAIL_ALREADY_REGISTERED") return copy.errors.emailRegistered;
  if (message === "RESTAURANT_REQUIRED") return copy.errors.restaurantRequired;
  if (message === "TERMS_NOT_ACCEPTED") return copy.errors.termsRequired;
  if (message === "Network Error" || message === "HTTP 0") return copy.errors.network;

  return message || copy.errors.registerFallback;
}

function validateLoginForm(email: string, password: string, copy: AuthCopy): string | null {
  if (!EMAIL_PATTERN.test(email)) return copy.errors.invalidEmail;
  if (password.length < 8) return copy.errors.invalidPassword;
  return null;
}

function validateRegisterForm(form: RegisterFormState, copy: AuthCopy): string | null {
  if (!form.familyName.trim() || !form.givenName.trim()) return copy.errors.nameRequired;
  if (!EMAIL_PATTERN.test(form.email.trim().toLowerCase())) return copy.errors.invalidEmail;
  if (form.password.length < 8) return copy.errors.invalidPassword;
  if (form.birthday) {
    const parsedBirthday = new Date(`${form.birthday}T00:00:00.000Z`);
    if (Number.isNaN(parsedBirthday.getTime())) return copy.errors.invalidBirthday;
  }
  if (!form.restaurantId) return copy.errors.restaurantRequired;
  if (!form.acceptedTerms) return copy.errors.termsRequired;
  return null;
}

const AUTH_LANGUAGES: AuthLanguage[] = ["zh", "en", "fr"];

function toAuthLanguage(value: string | null | undefined): AuthLanguage | null {
  return AUTH_LANGUAGES.includes(value as AuthLanguage) ? (value as AuthLanguage) : null;
}

export function LoginScreen() {
  const authStatus = useStore(mobileAuthStore, (state) => state.status);
  const authUser = useStore(mobileAuthStore, (state) => state.user);
  const authError = useStore(mobileAuthStore, (state) => state.error);

  const [mode, setMode] = useState<AuthMode>("login");
  const [language, setLanguage] = useState<AuthLanguage>("zh");
  // Which user id we've already adopted the server language for, so a manual
  // in-app switch is never overwritten by a later store update for the same user.
  const syncedLanguageForUserRef = useRef<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registerForm, setRegisterForm] = useState(initialRegisterForm);
  const [restaurants, setRestaurants] = useState<RestaurantSummary[]>([]);
  const [hasLoadedRestaurants, setHasLoadedRestaurants] = useState(false);
  const [isLoadingRestaurants, setIsLoadingRestaurants] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingForgotPassword, setIsSubmittingForgotPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // On login, adopt the language saved on the account. Guarded per user id so a
  // later store refresh (or a manual switch) never snaps the UI back.
  useEffect(() => {
    if (authStatus !== "authenticated" || !authUser) {
      return;
    }

    const userId = String(authUser.id);
    if (syncedLanguageForUserRef.current === userId) {
      return;
    }

    syncedLanguageForUserRef.current = userId;
    const preferred = toAuthLanguage(authUser.preferredLanguage);
    if (preferred) {
      setLanguage(preferred);
    }
  }, [authStatus, authUser]);

  const copy = AUTH_COPY[language];
  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const selectedRestaurant = restaurants.find(
    (restaurant) => restaurant.id === registerForm.restaurantId,
  );
  const activeStage = mode === "login" ? copy.topStageLogin : copy.topStageRegister;
  const headingTitle = mode === "login" ? copy.titleLogin : copy.titleRegister;
  const headingKicker = mode === "login" ? copy.kickerLogin : copy.kickerRegister;
  const headingLede = mode === "login" ? copy.ledeLogin : copy.ledeRegister;

  function clearFeedback(): void {
    setFeedback(null);
    setSuccessMessage(null);
  }

  async function loadRestaurants(): Promise<void> {
    if (hasLoadedRestaurants || isLoadingRestaurants) return;

    setIsLoadingRestaurants(true);
    clearFeedback();

    try {
      const list = await mobileApiClient.get<RestaurantSummary[]>("/restaurants");
      setRestaurants(list);
      setHasLoadedRestaurants(true);
    } catch (error) {
      setFeedback(resolveRegisterErrorMessage(error, copy));
    } finally {
      setIsLoadingRestaurants(false);
    }
  }

  function switchMode(nextMode: AuthMode): void {
    setMode(nextMode);
    clearFeedback();

    if (nextMode === "register") void loadRestaurants();
  }

  async function submitLogin(): Promise<void> {
    clearFeedback();

    const validationError = validateLoginForm(normalizedEmail, password, copy);
    if (validationError) {
      setFeedback(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      await mobileAuthActions.login({ email: normalizedEmail, password });

      if (!rememberDevice) {
        await secureTokenStorage.removeAccessToken();
        await secureTokenStorage.removeRefreshToken();
      }
    } catch (error) {
      setFeedback(resolveLoginErrorMessage(error, copy));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitForgotPassword(): Promise<void> {
    if (isSubmittingForgotPassword || mode !== "login") return;

    clearFeedback();

    if (!normalizedEmail) {
      setFeedback(copy.forgotEmailRequired);
      return;
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setFeedback(copy.errors.invalidEmail);
      return;
    }

    setIsSubmittingForgotPassword(true);

    try {
      await mobileAuthApi.forgotPassword({
        email: normalizedEmail,
        language,
      });
      setSuccessMessage(copy.forgotSuccess);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : copy.forgotUnknownError);
    } finally {
      setIsSubmittingForgotPassword(false);
    }
  }

  async function submitLogout(): Promise<void> {
    // Revoke the push token while still authenticated; ignore failures so a
    // network hiccup never blocks logout.
    await unregisterPushToken().catch(() => undefined);
    await mobileAuthActions.logout();
  }

  async function submitProfileUpdate(input: UpdateMeRequest): Promise<void> {
    await mobileAuthActions.updateMe(input);
  }

  // Persists the chosen display language to the account so notifications (built
  // from `preferredLanguage` on the server) follow it. Best-effort: a failed
  // write only means the badge language lags, never a broken UI.
  function changeLanguage(nextLanguage: AuthLanguage): void {
    setLanguage(nextLanguage);
    if (authStatus === "authenticated") {
      void mobileAuthActions.updateMe({ language: nextLanguage }).catch(() => undefined);
    }
  }

  async function submitPasswordChange(input: ChangePasswordRequest): Promise<void> {
    await mobileAuthActions.changePassword(input);
  }

  async function submitDeleteAccount(input: DeleteAccountRequest): Promise<void> {
    // Revoke the push token while still authenticated; ignore failures so a
    // network hiccup never blocks the deletion.
    await unregisterPushToken().catch(() => undefined);
    await mobileAuthActions.deleteAccount(input);
  }

  async function submitRegister(): Promise<void> {
    clearFeedback();

    const validationError = validateRegisterForm(registerForm, copy);
    if (validationError) {
      setFeedback(validationError);
      return;
    }
    const restaurantId = registerForm.restaurantId;

    if (!restaurantId) {
      setFeedback(copy.errors.restaurantRequired);
      return;
    }

    setIsSubmitting(true);

    try {
      await mobileAuthActions.register({
        familyName: registerForm.familyName.trim(),
        givenName: registerForm.givenName.trim(),
        email: registerForm.email.trim().toLowerCase(),
        password: registerForm.password,
        restaurantId,
        birthday: registerForm.birthday || undefined,
        jobRole: registerForm.roles.length ? registerForm.roles.join(",") : undefined,
        profilePhotoDataUrl: registerForm.profilePhotoDataUrl.trim() || undefined,
        acceptedTerms: registerForm.acceptedTerms,
        language,
      });

      setShowPassword(false);
      setRegisterForm(initialRegisterForm);
      setSuccessMessage(copy.registrationPending);
    } catch (error) {
      setFeedback(resolveRegisterErrorMessage(error, copy));
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateRegisterField<Key extends keyof RegisterFormState>(
    key: Key,
    value: RegisterFormState[Key],
  ): void {
    clearFeedback();
    setRegisterForm((current) => ({ ...current, [key]: value }));
  }

  function toggleRole(role: string): void {
    clearFeedback();
    setRegisterForm((current) => {
      const roles = current.roles.includes(role) ? [] : [role];

      return { ...current, roles };
    });
  }

  if (authStatus === "loading" && !isSubmitting) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centeredState}>
          <ZhaoLoadingIndicator label={copy.loadingSession} />
        </View>
      </SafeAreaView>
    );
  }

  if (authStatus === "authenticated" && authUser) {
    return (
      <DashboardHomeScreen
        language={language}
        user={authUser}
        onChangeLanguage={changeLanguage}
        onLogout={submitLogout}
        onChangePassword={submitPasswordChange}
        onUpdateProfile={submitProfileUpdate}
        onDeleteAccount={submitDeleteAccount}
      />
    );
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
          <View style={styles.formSide}>
            <TopIndex
              activeStage={activeStage}
              copy={copy}
              language={language}
              onChangeLanguage={(nextLanguage) => {
                clearFeedback();
                setLanguage(nextLanguage);
              }}
            />

            <View style={styles.main}>
              <AuthHeading kicker={headingKicker} lede={headingLede} title={headingTitle} />

              {mode === "login" ? (
                <LoginForm
                  copy={copy}
                  email={email}
                  isSubmittingForgotPassword={isSubmittingForgotPassword}
                  password={password}
                  rememberDevice={rememberDevice}
                  showPassword={showPassword}
                  onChangeEmail={(value) => {
                    clearFeedback();
                    setEmail(value);
                  }}
                  onChangePassword={(value) => {
                    clearFeedback();
                    setPassword(value);
                  }}
                  onForgotPassword={submitForgotPassword}
                  onTogglePassword={() => setShowPassword((current) => !current)}
                  onToggleRemember={() => setRememberDevice((current) => !current)}
                />
              ) : (
                <RegisterForm
                  copy={copy}
                  form={registerForm}
                  isLoadingRestaurants={isLoadingRestaurants}
                  restaurants={restaurants}
                  selectedRestaurantName={selectedRestaurant?.name}
                  onChange={updateRegisterField}
                  onReloadRestaurants={() => {
                    setHasLoadedRestaurants(false);
                    void loadRestaurants();
                  }}
                  onToggleRole={toggleRole}
                />
              )}

              {(feedback || authError) && (
                <FeedbackMessage tone="error">{feedback || authError}</FeedbackMessage>
              )}
              {successMessage ? (
                <FeedbackMessage tone="success">{successMessage}</FeedbackMessage>
              ) : null}

              <PrimaryButton
                isLoading={isSubmitting}
                label={
                  isSubmitting
                    ? mode === "login"
                      ? copy.loginSubmitting
                      : copy.registerSubmitting
                    : mode === "login"
                      ? copy.ctaLogin
                      : copy.ctaRegister
                }
                onPress={mode === "login" ? submitLogin : submitRegister}
              />

              <SwitchLine
                actionLabel={mode === "login" ? copy.join : copy.switchBack}
                hint={mode === "login" ? copy.newHere : copy.alreadyFamily}
                onPress={() => switchMode(mode === "login" ? "register" : "login")}
              />
            </View>

            <View style={styles.bottom}>
              <Text style={styles.bottomText}>
                {copy.est} <Text style={styles.bottomBold}>{copy.estYear}</Text>
              </Text>
              <Pressable>
                <Text style={styles.bottomLink}>{copy.help}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create(
  scaleStyles({
    bottom: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    bottomBold: {
      color: authControlStyles.colors.ink,
    },
    bottomLink: {
      borderBottomColor: authControlStyles.colors.ink,
      borderBottomWidth: 1,
      color: authControlStyles.colors.ink,
      fontFamily: "monospace",
      fontSize: 11,
      letterSpacing: 0.7,
      paddingBottom: 1,
    },
    bottomText: {
      color: authControlStyles.colors.ink40,
      fontFamily: "monospace",
      fontSize: 11,
      letterSpacing: 0.7,
    },
    centeredState: {
      alignItems: "center",
      flex: 1,
      justifyContent: "center",
    },
    formSide: {
      backgroundColor: authControlStyles.colors.paper,
      flexGrow: 1,
      justifyContent: "space-between",
      paddingBottom: 32,
      paddingHorizontal: 24,
      paddingTop: 32,
    },
    keyboardView: {
      flex: 1,
    },
    main: {
      paddingBottom: 42,
      paddingTop: 30,
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
    selectedStore: {
      color: authControlStyles.colors.ink60,
      fontFamily: "serif",
      fontSize: 14,
      marginTop: 12,
    },
    stateText: {
      color: authControlStyles.colors.ink60,
      fontFamily: "serif",
      fontSize: 14,
      marginTop: 14,
    },
  }),
);
