"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/features/auth/context/AuthContext";
import styles from "@/features/auth/auth-page.module.css";
import AuthCredentialsStep from "@/features/auth/components/AuthCredentialsStep";
import RegisterDetailsStep from "@/features/auth/components/RegisterDetailsStep";
import StoreSelectionStep from "@/features/auth/components/StoreSelectionStep";
import { AUTH_PANEL_COPY } from "@/features/auth/constants/auth-panel-copy";
import { useRegisterStores } from "@/features/auth/hooks/useRegisterStores";
import { registerUser } from "@/features/auth/services/authApi";

const LANGUAGE_OPTIONS = [
  { value: "zh", label: "中文" },
  { value: "en", label: "EN" },
  { value: "fr", label: "FR" },
];

const STEP_COPY_KEY = {
  login: "login",
  registerForm: "register",
  storeSelection: "storeSelection",
  registerDetails: "registerDetails",
};

const STEP_TRANSITION = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -18 },
  transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
};

const INITIAL_VALUES = {
  familyName: "",
  givenName: "",
  email: "",
  password: "",
  remember: true,
};

const INITIAL_EXTRA_DETAILS = {
  avatarFile: null,
  avatarPreviewUrl: "",
  birthday: "",
  role: "",
};

function revokeObjectUrl(previewUrl) {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("FAILED_TO_READ_AVATAR"));
    };
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("FAILED_TO_READ_AVATAR"));
        return;
      }

      resolve(reader.result);
    };

    reader.readAsDataURL(file);
  });
}

function getStepCopy(t, step) {
  const key = STEP_COPY_KEY[step];

  if (key === "login") {
    return {
      topStage: t.topStageLogin,
      kicker: t.kickerLogin,
      title: t.titleLogin,
      lede: t.ledeLogin,
    };
  }

  if (key === "register") {
    return {
      topStage: t.topStageRegister,
      kicker: t.kickerRegister,
      title: t.titleRegister,
      lede: t.ledeRegister,
    };
  }

  if (key === "storeSelection") {
    return {
      topStage: t.topStageStoreSelection,
      kicker: t.kickerStoreSelection,
      title: t.titleStoreSelection,
      lede: t.ledeStoreSelection,
    };
  }

  return {
    topStage: t.topStageRegisterDetails,
    kicker: t.kickerRegisterDetails,
    title: t.titleRegisterDetails,
    lede: t.ledeRegisterDetails,
  };
}

export default function GlassAuthPanel() {
  const router = useRouter();
  const { login } = useAuth();
  const [step, setStep] = useState("login");
  const [lang, setLang] = useState("zh");
  const [showPw, setShowPw] = useState(false);
  const [values, setValues] = useState(INITIAL_VALUES);
  const [extraDetails, setExtraDetails] = useState(INITIAL_EXTRA_DETAILS);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [storeSelectionError, setStoreSelectionError] = useState("");
  const [registrationError, setRegistrationError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
  const [isSubmittingRegistration, setIsSubmittingRegistration] = useState(false);
  const [isRegistrationSuccessful, setIsRegistrationSuccessful] = useState(false);

  const { stores, isLoadingStores, storesError } = useRegisterStores();
  const t = AUTH_PANEL_COPY[lang];
  const stepCopy = getStepCopy(t, step);
  const isLogin = step === "login";
  const selectedStore = useMemo(
    () => stores.find((store) => store.id === selectedStoreId) ?? null,
    [selectedStoreId, stores],
  );
  const registerDisplayName = useMemo(() => {
    const fullName = [values.familyName, values.givenName].filter(Boolean).join(" ").trim();

    if (fullName) {
      return fullName;
    }

    return values.email.trim();
  }, [values.email, values.familyName, values.givenName]);

  useEffect(() => {
    if (!selectedStoreId) {
      return;
    }

    const hasSelectedStore = stores.some((store) => store.id === selectedStoreId);

    if (!hasSelectedStore) {
      setSelectedStoreId("");
    }
  }, [selectedStoreId, stores]);

  useEffect(() => {
    if (
      step === "registerDetails" &&
      selectedStoreId &&
      !selectedStore &&
      !isLoadingStores &&
      !storesError
    ) {
      setStep("storeSelection");
    }
  }, [step, selectedStoreId, selectedStore, isLoadingStores, storesError]);

  useEffect(() => {
    return () => {
      revokeObjectUrl(extraDetails.avatarPreviewUrl);
    };
  }, [extraDetails.avatarPreviewUrl]);

  function updateValue(key, value) {
    setLoginError("");
    clearRegistrationFeedback();
    setValues((current) => ({ ...current, [key]: value }));
  }

  function updateExtraDetail(key, value) {
    setRegistrationError("");
    setIsRegistrationSuccessful(false);
    setExtraDetails((current) => ({ ...current, [key]: value }));
  }

  function updateAvatar(file) {
    setExtraDetails((current) => {
      revokeObjectUrl(current.avatarPreviewUrl);

      if (!file) {
        return {
          ...current,
          avatarFile: null,
          avatarPreviewUrl: "",
        };
      }

      return {
        ...current,
        avatarFile: file,
        avatarPreviewUrl: URL.createObjectURL(file),
      };
    });
    setRegistrationError("");
    setIsRegistrationSuccessful(false);
  }

  function clearRegistrationFeedback() {
    setRegistrationError("");
    setIsRegistrationSuccessful(false);
  }

  function resetRegistrationFlow(nextStep = "login") {
    revokeObjectUrl(extraDetails.avatarPreviewUrl);
    setValues(INITIAL_VALUES);
    setExtraDetails(INITIAL_EXTRA_DETAILS);
    setSelectedStoreId("");
    setStoreSelectionError("");
    setRegistrationError("");
    setIsSubmittingRegistration(false);
    setIsRegistrationSuccessful(false);
    setShowPw(false);
    setStep(nextStep);
  }

  async function handleCredentialsSubmit(event) {
    event.preventDefault();

    if (isLogin) {
      setLoginError("");
      setIsSubmittingLogin(true);

      try {
        await login(values.email, values.password);
        router.push("/dashboard");
      } catch (error) {
        setLoginError(error instanceof Error ? error.message : t.detailsUnknownError);
      } finally {
        setIsSubmittingLogin(false);
      }
      return;
    }

    clearRegistrationFeedback();
    setStoreSelectionError("");
    setStep("storeSelection");
  }

  function handleContinueToDetails() {
    if (isLoadingStores || storesError) {
      return;
    }

    if (!selectedStoreId) {
      setStoreSelectionError(t.storeSelectionError);
      return;
    }

    clearRegistrationFeedback();
    setStoreSelectionError("");
    setStep("registerDetails");
  }

  function handleToggleMode() {
    if (step === "login") {
      clearRegistrationFeedback();
      setStoreSelectionError("");
      setStep("registerForm");
      return;
    }

    resetRegistrationFlow("login");
  }

  async function handleRegisterSubmit() {
    if (isSubmittingRegistration || !selectedStore) {
      return;
    }

    if (!values.remember) {
      setRegistrationError(t.termsRequiredError);
      return;
    }

    setRegistrationError("");
    setIsSubmittingRegistration(true);

    try {
      const profilePhotoDataUrl = extraDetails.avatarFile
        ? await readFileAsDataUrl(extraDetails.avatarFile)
        : undefined;

      await registerUser({
        familyName: values.familyName,
        givenName: values.givenName,
        email: values.email,
        password: values.password,
        restaurantId: Number(selectedStore.id),
        birthday: extraDetails.birthday || undefined,
        jobRole: extraDetails.role || undefined,
        profilePhotoDataUrl,
        acceptedTerms: values.remember,
        language: lang,
      });

      setIsRegistrationSuccessful(true);
    } catch (error) {
      setRegistrationError(
        error instanceof Error ? error.message : t.detailsUnknownError,
      );
    } finally {
      setIsSubmittingRegistration(false);
    }
  }

  function renderStep() {
    if (step === "storeSelection") {
      return (
        <StoreSelectionStep
          t={t}
          stores={stores}
          isLoadingStores={isLoadingStores}
          storesError={storesError}
          selectedStoreId={selectedStoreId}
          storeSelectionError={storeSelectionError}
          onBack={() => setStep("registerForm")}
          onContinue={handleContinueToDetails}
          onSelectStore={setSelectedStoreId}
        />
      );
    }

    if (step === "registerDetails" && selectedStore) {
      return (
        <RegisterDetailsStep
          t={t}
          selectedStore={selectedStore}
          extraDetails={extraDetails}
          memberName={registerDisplayName}
          isSubmitting={isSubmittingRegistration}
          isSubmitSuccessful={isRegistrationSuccessful}
          submitError={registrationError}
          onChangeExtraDetail={updateExtraDetail}
          onChangeAvatar={updateAvatar}
          onSubmit={handleRegisterSubmit}
          onBack={() => {
            clearRegistrationFeedback();
            setStep("storeSelection");
          }}
          onReturnToLogin={() => resetRegistrationFlow("login")}
        />
      );
    }

    return (
      <AuthCredentialsStep
        isLogin={isLogin}
        t={t}
        values={values}
        showPw={showPw}
        onTogglePassword={() => setShowPw((current) => !current)}
        onChangeValue={updateValue}
        onSubmit={handleCredentialsSubmit}
        onToggleMode={handleToggleMode}
        submitError={loginError}
        isSubmitting={isSubmittingLogin}
      />
    );
  }

  return (
    <section className={styles.formSide}>
      <div className={styles.top}>
        <div className={styles.topIndex}>
          <span>
            <span className={styles.topIndexBold}>ZHAO</span>
            &nbsp;/&nbsp;{t.topFamily}
          </span>
          <span>{stepCopy.topStage}</span>
        </div>

        <div className={styles.topLang} role="group" aria-label="Language">
          {LANGUAGE_OPTIONS.map((option, index) => (
            <Fragment key={option.value}>
              {index > 0 ? <span className={styles.topLangSep}>/</span> : null}
              <button
                type="button"
                className={`${styles.topLangBtn} ${
                  lang === option.value ? styles.topLangBtnActive : ""
                }`}
                onClick={() => setLang(option.value)}
              >
                {option.label}
              </button>
            </Fragment>
          ))}
        </div>
      </div>

      <div className={styles.main}>
        <AnimatePresence mode="wait">
          <motion.div key={step} {...STEP_TRANSITION}>
            <div className={styles.kicker}>
              <span className={styles.kickerDot} aria-hidden="true" />
              <span>{stepCopy.kicker}</span>
            </div>

            <h1 className={styles.title}>
              {stepCopy.title[0]}
              <em className={styles.titleEm}>{stepCopy.title[1]}</em>
              {stepCopy.title[2]}
              <br />
              <span className={styles.titleZh}>{stepCopy.title[3]}</span>
            </h1>

            <p className={styles.lede}>{stepCopy.lede}</p>

            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className={styles.bottom}>
        <div className={styles.bottomBlock}>
          <span>
            {t.est} <span className={styles.bottomBold}>{t.estYear}</span>
          </span>
        </div>
        <div className={`${styles.bottomBlock} ${styles.bottomBlockRight}`}>
          <a href="#" className={styles.bottomLink}>
            {t.help}
          </a>
        </div>
      </div>
    </section>
  );
}
