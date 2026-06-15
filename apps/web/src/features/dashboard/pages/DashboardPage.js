"use client";

import { Fragment, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";

import { useAuth } from "@/features/auth/context/AuthContext";
import DashboardNewsModule from "@/features/dashboard/components/DashboardNewsModule";
import Sidebar from "@/features/dashboard/components/Sidebar";
import StoreScoreLeaderboard from "@/features/dashboard/components/StoreScoreLeaderboard";
import {
  DASHBOARD_COPY,
  DASHBOARD_LANGUAGES,
  DASHBOARD_MENU_LABELS,
  DASHBOARD_SHORTCUT_HREFS,
} from "@/features/dashboard/constants/dashboard-copy";
import { usePreferredLanguage } from "@/shared/hooks/usePreferredLanguage";
import styles from "@/features/dashboard/dashboard-page.module.css";

function resolveDisplayName(user, fallback) {
  return (
    user?.name?.trim() ||
    [user?.familyName, user?.givenName].filter(Boolean).join(" ").trim() ||
    fallback
  );
}

export default function DashboardPage() {
  const [lang, setLang] = usePreferredLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const menuLabels = DASHBOARD_MENU_LABELS[lang];
  const t = DASHBOARD_COPY[lang];
  const newsCopy = t.newsModule;
  const scoreLeaderboardCopy = t.scoreLeaderboard;
  const displayName = resolveDisplayName(user, t.greetingFallback);

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
          {t.greetingPrefix}
          <span className={styles.titleEm}>{displayName}</span>
          {t.greetingSuffix}
        </h1>

        <p className={styles.lede}>{t.lede}</p>

        <p className={styles.shortcutsHeading}>{t.shortcutsHeading}</p>

        <div className={styles.shortcutGrid}>
          {t.shortcuts.map((shortcut, index) => (
            <Link
              key={shortcut.id}
              href={DASHBOARD_SHORTCUT_HREFS[shortcut.id] || "#"}
              className={styles.shortcutCard}
            >
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: 0.1 + index * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <span className={styles.shortcutIndex}>
                  <span className={styles.shortcutIndexNum}>{shortcut.index}</span>
                  <span>— {shortcut.label}</span>
                </span>

                <div className={styles.shortcutBody}>
                  <h2 className={styles.shortcutTitle}>{shortcut.title}</h2>
                  <p className={styles.shortcutDetail}>{shortcut.detail}</p>
                </div>

                <span className={styles.shortcutArrow} aria-hidden="true">
                  →
                </span>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.section>

      <DashboardNewsModule lang={lang} copy={newsCopy} />

      <StoreScoreLeaderboard copy={scoreLeaderboardCopy} />

      <footer className={styles.footer}>{t.footer}</footer>

      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} lang={lang} />
    </main>
  );
}
