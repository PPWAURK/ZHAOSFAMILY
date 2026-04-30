"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";

import { useAuth } from "@/features/auth/context/AuthContext";
import Sidebar from "@/features/dashboard/components/Sidebar";
import {
  DASHBOARD_LANGUAGES,
  DASHBOARD_MENU_LABELS,
} from "@/features/dashboard/constants/dashboard-copy";
import { PROFILE_COPY } from "@/features/profile/constants/profile-copy";
import styles from "@/features/profile/profile-page.module.css";

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

export default function ProfilePage() {
  const { user, isLoading, logout, updateMe } = useAuth();
  const [lang, setLang] = useState("zh");
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
            <div className={styles.heroMeta}>
              <span>{email}</span>
              <span>{role}</span>
              <span>{store}</span>
            </div>
          </div>
        </div>

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
            <div className={styles.btnRow}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                disabled
              >
                {t.changePassword}
              </button>
            </div>
          </header>
          <p className={styles.placeholder}>{t.passwordPlaceholder}</p>
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
