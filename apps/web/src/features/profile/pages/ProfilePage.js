"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";

import { useAuth } from "@/features/auth/context/AuthContext";
import Sidebar from "@/features/dashboard/components/Sidebar";
import {
  equipTrainingTitle,
  fetchTrainingMyTitles,
} from "@/features/training/services/trainingMediaApi";
import {
  DASHBOARD_LANGUAGES,
  DASHBOARD_MENU_LABELS,
} from "@/features/dashboard/constants/dashboard-copy";
import { PROFILE_COPY } from "@/features/profile/constants/profile-copy";
import { usePreferredLanguage } from "@/shared/hooks/usePreferredLanguage";
import styles from "@/features/profile/profile-page.module.css";

const TITLE_FRAME_CLASS_BY_STYLE = {
  red: "profileTitleFrameRed",
  gold: "profileTitleFrameGold",
  ink: "profileTitleFrameInk",
  jade: "profileTitleFrameJade",
  blue: "profileTitleFrameBlue",
  purple: "profileTitleFramePurple",
};

function initialsOf(name) {
  if (!name) return "Z";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getTrainingTitleName(title, lang) {
  return title?.name?.[lang] || title?.name?.zh || title?.code || "-";
}

function getTitleFrameClass(title) {
  const frameClass =
    TITLE_FRAME_CLASS_BY_STYLE[title?.frameStyle] || TITLE_FRAME_CLASS_BY_STYLE.red;

  return `${styles.profileTitleFrame} ${styles[frameClass]}`;
}

export default function ProfilePage() {
  const { user, isLoading, logout, updateMe, changePassword, deleteAccount } =
    useAuth();
  const [lang, setLang] = usePreferredLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [contact, setContact] = useState({
    phone: user?.phone || "",
    address: user?.address || "",
  });
  const [draft, setDraft] = useState(contact);
  const [changingPwd, setChangingPwd] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdChanged, setPwdChanged] = useState(false);
  const [pwdError, setPwdError] = useState(null);
  const emptyPwd = { current: "", next: "", confirm: "" };
  const [pwd, setPwd] = useState(emptyPwd);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletingSubmit, setDeletingSubmit] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [myTitles, setMyTitles] = useState({
    earned: [],
    available: [],
    equippedTitleCode: null,
    equippedTitle: null,
  });
  const [isLoadingTitles, setIsLoadingTitles] = useState(false);
  const [titleError, setTitleError] = useState("");
  const [savingTitleCode, setSavingTitleCode] = useState("");

  const t = PROFILE_COPY[lang];
  const menuLabels = DASHBOARD_MENU_LABELS[lang];

  const displayName = useMemo(() => {
    const composed = [user?.lastName, user?.firstName].filter(Boolean).join(" ").trim();
    return composed || user?.name?.trim() || t.noValue;
  }, [user, t.noValue]);

  const email = user?.email || t.noValue;
  const role = user?.role || user?.position || user?.jobRole || t.noValue;
  const store = user?.store?.name || user?.storeName || user?.establishment || t.noValue;
  const avatar = user?.avatarUrl || user?.avatar || null;

  useEffect(() => {
    const nextContact = {
      phone: user?.phone || "",
      address: user?.address || "",
    };

    setContact(nextContact);
    setDraft(nextContact);
  }, [user]);

  useEffect(() => {
    let isActive = true;

    async function loadMyTitles() {
      if (!user?.id) return;

      setIsLoadingTitles(true);
      setTitleError("");

      try {
        const nextTitles = await fetchTrainingMyTitles();
        if (isActive) setMyTitles(nextTitles);
      } catch {
        if (isActive) setTitleError("LOAD_ERROR");
      } finally {
        if (isActive) setIsLoadingTitles(false);
      }
    }

    void loadMyTitles();

    return () => {
      isActive = false;
    };
  }, [user?.id]);

  function startEdit() {
    setDraft(contact);
    setSaved(false);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function saveEdit() {
    setSavingContact(true);

    try {
      const updatedUser = await updateMe({
        phone: draft.phone,
        address: draft.address,
      });
      const nextContact = {
        phone: updatedUser?.phone || "",
        address: updatedUser?.address || "",
      };

      setContact(nextContact);
      setDraft(nextContact);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2600);
    } finally {
      setSavingContact(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  }

  function startPwdChange() {
    setPwd(emptyPwd);
    setPwdError(null);
    setPwdChanged(false);
    setChangingPwd(true);
  }

  function cancelPwdChange() {
    setChangingPwd(false);
    setPwd(emptyPwd);
    setPwdError(null);
  }

  async function submitPwdChange() {
    if (pwd.next.length < 8) {
      setPwdError(t.passwordErrTooShort);
      return;
    }
    if (pwd.next !== pwd.confirm) {
      setPwdError(t.passwordErrMismatch);
      return;
    }

    setPwdError(null);
    setSavingPwd(true);

    try {
      await changePassword(pwd.current, pwd.next);
      setChangingPwd(false);
      setPwd(emptyPwd);
      setPwdChanged(true);
      setTimeout(() => setPwdChanged(false), 2600);
    } catch (error) {
      const code = error?.message;

      if (code === "INVALID_CURRENT_PASSWORD") {
        setPwdError(t.passwordErrCurrentWrong);
      } else if (code === "PASSWORD_TOO_SHORT") {
        setPwdError(t.passwordErrTooShort);
      } else {
        setPwdError(t.passwordErrGeneric);
      }
    } finally {
      setSavingPwd(false);
    }
  }

  function startDelete() {
    setDeletePassword("");
    setDeleteError(null);
    setDeletingAccount(true);
  }

  function cancelDelete() {
    setDeletingAccount(false);
    setDeletePassword("");
    setDeleteError(null);
  }

  async function submitDelete() {
    if (!deletePassword) {
      setDeleteError(t.deleteErrCurrentWrong);
      return;
    }

    setDeleteError(null);
    setDeletingSubmit(true);

    try {
      await deleteAccount(deletePassword);
      // Session is cleared inside deleteAccount; the route guard redirects to login.
    } catch (error) {
      const code = error?.message;

      if (code === "INVALID_CURRENT_PASSWORD" || code === "INVALID_SESSION") {
        setDeleteError(t.deleteErrCurrentWrong);
      } else {
        setDeleteError(t.deleteErrGeneric);
      }
      setDeletingSubmit(false);
    }
  }

  async function handleEquipTitle(code) {
    setSavingTitleCode(code);
    setTitleError("");

    try {
      setMyTitles(await equipTrainingTitle(code));
    } catch {
      setTitleError("SAVE_ERROR");
    } finally {
      setSavingTitleCode("");
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <div className={styles.topLeft}>
          <button
            type="button"
            className={`${styles.menuToggle} ${menuOpen ? styles.menuToggleOpen : ""}`}
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? menuLabels.close : menuLabels.open}
          >
            <span className={styles.menuToggleIcon} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            {menuOpen ? menuLabels.close : menuLabels.open}
          </button>

          <div className={styles.topIndex}>
            <span>
              <span className={styles.topIndexBold}>ZHAO</span>
              &nbsp;/&nbsp;{t.topFamily}
            </span>
            <span>{t.topStage}</span>
            <span>{t.topCycle}</span>
          </div>
        </div>

        <div className={styles.topLang} role="group" aria-label="Language">
          {DASHBOARD_LANGUAGES.map((option, index) => (
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
      </header>

      <motion.section
        className={styles.main}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className={styles.kicker}>
          <span className={styles.kickerDot} />
          {t.kicker}
        </p>

        <h1 className={styles.title}>
          {t.title}
          <span className={styles.titleEm}>{t.titleEm}</span>
          {t.titleSuffix}
        </h1>

        <p className={styles.lede}>{t.lede}</p>

        {isLoading ? (
          <section className={styles.section}>
            <p className={styles.sectionHint}>正在加载个人资料...</p>
          </section>
        ) : null}

        <div className={styles.hero}>
          <div className={styles.heroAvatar}>
            {avatar ? (
              <img src={avatar} alt={displayName} />
            ) : (
              <span className={styles.heroInitials}>{initialsOf(displayName)}</span>
            )}
          </div>
          <div className={styles.heroIdentity}>
            <h2 className={styles.heroName}>{displayName}</h2>
            {myTitles.equippedTitle ? (
              <span className={getTitleFrameClass(myTitles.equippedTitle)}>
                {getTrainingTitleName(myTitles.equippedTitle, lang)}
              </span>
            ) : null}
            <div className={styles.heroMeta}>
              <span>{email}</span>
              <span>{role}</span>
              <span>{store}</span>
            </div>
          </div>
        </div>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <div className={styles.sectionHeadingGroup}>
              <h3 className={styles.sectionHeading}>
                {lang === "zh"
                  ? "我的称号"
                  : lang === "fr"
                    ? "Mes titres"
                    : "My titles"}
              </h3>
              <p className={styles.sectionHint}>
                {lang === "zh"
                  ? "管理员分发后，你可以选择一个称号佩戴在个人档案中。"
                  : lang === "fr"
                    ? "Choisis un titre attribué à afficher sur ton profil."
                    : "Choose one assigned title to wear on your profile."}
              </p>
            </div>
          </header>

          {isLoadingTitles ? (
            <p className={styles.placeholder}>
              {lang === "zh"
                ? "正在加载称号..."
                : lang === "fr"
                  ? "Chargement des titres..."
                  : "Loading titles..."}
            </p>
          ) : myTitles.earned.length > 0 ? (
            <div className={styles.profileTitleGrid}>
              {myTitles.earned.map((title) => {
                const isEquipped = title.code === myTitles.equippedTitleCode;

                return (
                  <article key={title.code} className={styles.profileTitleCard}>
                    <span className={getTitleFrameClass(title)}>
                      {getTrainingTitleName(title, lang)}
                    </span>
                    <button
                      type="button"
                      className={`${styles.btn} ${
                        isEquipped ? styles.btnPrimary : styles.btnGhost
                      }`}
                      disabled={isEquipped || savingTitleCode === title.code}
                      onClick={() => handleEquipTitle(title.code)}
                    >
                      {isEquipped
                        ? lang === "zh"
                          ? "已佩戴"
                          : lang === "fr"
                            ? "Porté"
                            : "Wearing"
                        : lang === "zh"
                          ? "佩戴"
                          : lang === "fr"
                            ? "Porter"
                            : "Wear"}
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className={styles.placeholder}>
              {lang === "zh"
                ? "你还没有可佩戴称号。"
                : lang === "fr"
                  ? "Aucun titre attribué pour le moment."
                  : "No assigned titles yet."}
            </p>
          )}

          {titleError ? (
            <p className={styles.sectionHint}>
              {lang === "zh"
                ? "称号操作失败，请稍后再试。"
                : lang === "fr"
                  ? "Impossible de mettre à jour le titre."
                  : "Title update failed."}
            </p>
          ) : null}
        </section>

        {/* Identité */}
        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <div className={styles.sectionHeadingGroup}>
              <h3 className={styles.sectionHeading}>{t.identityHeading}</h3>
              <p className={styles.sectionHint}>{t.identityHint}</p>
            </div>
          </header>

          <dl className={styles.fieldList}>
            <div className={styles.fieldItem}>
              <dt>{t.fieldName}</dt>
              <dd>{displayName}</dd>
            </div>
            <div className={styles.fieldItem}>
              <dt>{t.fieldEmail}</dt>
              <dd>{email}</dd>
            </div>
            <div className={styles.fieldItem}>
              <dt>{t.fieldRole}</dt>
              <dd>{role}</dd>
            </div>
            <div className={styles.fieldItem}>
              <dt>{t.fieldStore}</dt>
              <dd>{store}</dd>
            </div>
          </dl>
        </section>

        {/* Coordonnées */}
        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <div className={styles.sectionHeadingGroup}>
              <h3 className={styles.sectionHeading}>{t.contactHeading}</h3>
              <p className={styles.sectionHint}>{t.contactHint}</p>
            </div>
            {!editing ? (
              <div className={styles.btnRow}>
                {saved ? <span className={styles.savedFlag}>✓ {t.saved}</span> : null}
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={startEdit}
                >
                  {t.edit}
                </button>
              </div>
            ) : null}
          </header>

          {editing ? (
            <>
              <dl className={styles.fieldList}>
                <div className={styles.fieldItem}>
                  <dt>{t.fieldPhone}</dt>
                  <dd>
                    <input
                      type="tel"
                      className={styles.input}
                      value={draft.phone}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      placeholder="+33 …"
                    />
                  </dd>
                </div>
                <div className={styles.fieldItem}>
                  <dt>{t.fieldAddress}</dt>
                  <dd>
                    <input
                      type="text"
                      className={styles.input}
                      value={draft.address}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, address: e.target.value }))
                      }
                    />
                  </dd>
                </div>
              </dl>
              <div className={styles.btnRow}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={saveEdit}
                  disabled={savingContact}
                >
                  {savingContact ? t.saving || t.save : t.save}
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={cancelEdit}
                >
                  {t.cancel}
                </button>
              </div>
            </>
          ) : (
            <dl className={styles.fieldList}>
              <div className={styles.fieldItem}>
                <dt>{t.fieldPhone}</dt>
                <dd className={contact.phone ? "" : styles.fieldEmpty}>
                  {contact.phone || t.noValue}
                </dd>
              </div>
              <div className={styles.fieldItem}>
                <dt>{t.fieldAddress}</dt>
                <dd className={contact.address ? "" : styles.fieldEmpty}>
                  {contact.address || t.noValue}
                </dd>
              </div>
            </dl>
          )}
        </section>

        {/* Préférences */}
        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <div className={styles.sectionHeadingGroup}>
              <h3 className={styles.sectionHeading}>{t.preferencesHeading}</h3>
              <p className={styles.sectionHint}>{t.preferencesHint}</p>
            </div>
          </header>

          <dl className={styles.fieldList}>
            <div className={styles.fieldItem}>
              <dt>{t.fieldLang}</dt>
              <dd>
                <select
                  className={styles.select}
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                >
                  {DASHBOARD_LANGUAGES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {t.langOption[opt.value]}
                    </option>
                  ))}
                </select>
              </dd>
            </div>
          </dl>
        </section>

        {/* Sécurité */}
        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <div className={styles.sectionHeadingGroup}>
              <h3 className={styles.sectionHeading}>{t.securityHeading}</h3>
              <p className={styles.sectionHint}>{t.securityHint}</p>
            </div>
            {!changingPwd ? (
              <div className={styles.btnRow}>
                {pwdChanged ? (
                  <span className={styles.savedFlag}>{t.passwordChanged}</span>
                ) : null}
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={startPwdChange}
                >
                  {t.changePassword}
                </button>
              </div>
            ) : null}
          </header>

          {changingPwd ? (
            <>
              <p className={styles.sectionHint}>{t.passwordIntro}</p>
              <dl className={styles.fieldList}>
                <div className={styles.fieldItem}>
                  <dt>{t.fieldCurrentPassword}</dt>
                  <dd>
                    <input
                      type="password"
                      autoComplete="current-password"
                      className={styles.input}
                      value={pwd.current}
                      onChange={(e) =>
                        setPwd((prev) => ({ ...prev, current: e.target.value }))
                      }
                    />
                  </dd>
                </div>
                <div className={styles.fieldItem}>
                  <dt>{t.fieldNewPassword}</dt>
                  <dd>
                    <input
                      type="password"
                      autoComplete="new-password"
                      className={styles.input}
                      value={pwd.next}
                      onChange={(e) =>
                        setPwd((prev) => ({ ...prev, next: e.target.value }))
                      }
                    />
                  </dd>
                </div>
                <div className={styles.fieldItem}>
                  <dt>{t.fieldConfirmPassword}</dt>
                  <dd>
                    <input
                      type="password"
                      autoComplete="new-password"
                      className={styles.input}
                      value={pwd.confirm}
                      onChange={(e) =>
                        setPwd((prev) => ({ ...prev, confirm: e.target.value }))
                      }
                    />
                  </dd>
                </div>
              </dl>
              {pwdError ? (
                <p className={styles.sectionStatus}>{pwdError}</p>
              ) : (
                <p className={styles.sectionHint}>{t.passwordRule}</p>
              )}
              <div className={styles.btnRow}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={submitPwdChange}
                  disabled={savingPwd}
                >
                  {savingPwd ? t.passwordSubmitting : t.passwordSubmit}
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={cancelPwdChange}
                  disabled={savingPwd}
                >
                  {t.cancel}
                </button>
              </div>
            </>
          ) : null}
        </section>

        {/* Déconnexion */}
        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <div className={styles.sectionHeadingGroup}>
              <h3 className={styles.sectionHeading}>{t.logoutHeading}</h3>
              <p className={styles.sectionHint}>{t.logoutHint}</p>
            </div>
            <div className={styles.btnRow}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnDanger}`}
                onClick={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? t.loggingOut : t.logout}
              </button>
            </div>
          </header>
        </section>

        {/* Suppression du compte */}
        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <div className={styles.sectionHeadingGroup}>
              <h3 className={styles.sectionHeading}>{t.dangerHeading}</h3>
              <p className={styles.sectionHint}>{t.dangerHint}</p>
            </div>
            {!deletingAccount ? (
              <div className={styles.btnRow}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnDanger}`}
                  onClick={startDelete}
                >
                  {t.deleteAccount}
                </button>
              </div>
            ) : null}
          </header>

          {deletingAccount ? (
            <>
              <p className={styles.sectionHint}>{t.deleteWarning}</p>
              <dl className={styles.fieldList}>
                <div className={styles.fieldItem}>
                  <dt>{t.fieldDeletePassword}</dt>
                  <dd>
                    <input
                      type="password"
                      autoComplete="current-password"
                      className={styles.input}
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                    />
                  </dd>
                </div>
              </dl>
              {deleteError ? (
                <p className={styles.sectionStatus}>{deleteError}</p>
              ) : null}
              <div className={styles.btnRow}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnDanger}`}
                  onClick={submitDelete}
                  disabled={deletingSubmit}
                >
                  {deletingSubmit ? t.deleteSubmitting : t.deleteConfirm}
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={cancelDelete}
                  disabled={deletingSubmit}
                >
                  {t.cancel}
                </button>
              </div>
            </>
          ) : null}
        </section>

        <div className={styles.backRow}>
          <Link href="/dashboard" className={styles.backLink}>
            ← {t.back}
          </Link>
        </div>
      </motion.section>

      <footer className={styles.footer}>{t.footer}</footer>

      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} lang={lang} />
    </main>
  );
}
