"use client";

import { Fragment, useState, type ReactNode } from "react";

import Sidebar from "@/features/dashboard/components/Sidebar";
import {
  DASHBOARD_LANGUAGES,
  DASHBOARD_MENU_LABELS,
} from "@/features/dashboard/constants/dashboard-copy";
import dashboardStyles from "@/features/dashboard/dashboard-page.module.css";

import { toUiLanguage, type ExamUiLanguage } from "../constants/exam-languages";
import styles from "../exams.module.css";

type ExamShellProps = {
  lang: ExamUiLanguage;
  onLanguageChange: (lang: ExamUiLanguage) => void;
  kicker: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

/** Dashboard chrome (menu, language switch, sidebar) shared by every exam page. */
export default function ExamShell({
  lang,
  onLanguageChange,
  kicker,
  title,
  subtitle,
  children,
}: ExamShellProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuLabels = DASHBOARD_MENU_LABELS[lang];

  return (
    <main className={`${dashboardStyles.page} ${styles.page}`}>
      <header className={dashboardStyles.top}>
        <div className={dashboardStyles.topLeft}>
          <button
            type="button"
            className={`${dashboardStyles.menuToggle} ${isMenuOpen ? dashboardStyles.menuToggleOpen : ""}`}
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? menuLabels.close : menuLabels.open}
          >
            <span className={dashboardStyles.menuToggleIcon} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            {isMenuOpen ? menuLabels.close : menuLabels.open}
          </button>
          <div className={dashboardStyles.topIndex}>
            <span>
              <span className={dashboardStyles.topIndexBold}>ZHAO</span>&nbsp;/&nbsp;FAMILY
            </span>
            <span>EXAM</span>
          </div>
        </div>
        <div className={dashboardStyles.topLang} role="group" aria-label="Language">
          {DASHBOARD_LANGUAGES.map((option, index) => (
            <Fragment key={option.value}>
              {index > 0 ? <span className={dashboardStyles.topLangSep}>/</span> : null}
              <button
                type="button"
                className={`${dashboardStyles.topLangBtn} ${lang === option.value ? dashboardStyles.topLangBtnActive : ""}`}
                onClick={() => onLanguageChange(toUiLanguage(option.value))}
              >
                {option.label}
              </button>
            </Fragment>
          ))}
        </div>
      </header>

      <section className={styles.content}>
        <p className={styles.kicker}>{kicker}</p>
        <h1 className={styles.title}>{title}</h1>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        {children}
      </section>

      <Sidebar open={isMenuOpen} onClose={() => setIsMenuOpen(false)} lang={lang} />
    </main>
  );
}
