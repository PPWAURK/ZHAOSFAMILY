"use client";

import { Fragment, useState } from "react";

import { useAuth } from "@/features/auth/context/AuthContext";
import Sidebar from "@/features/dashboard/components/Sidebar";
import {
  DASHBOARD_LANGUAGES,
  DASHBOARD_MENU_LABELS,
} from "@/features/dashboard/constants/dashboard-copy";
import HeadquartersDesk from "@/features/recruitment-requests/components/HeadquartersDesk";
import StoreRequestPanel from "@/features/recruitment-requests/components/StoreRequestPanel";
import { RECRUITMENT_REQUEST_COPY } from "@/features/recruitment-requests/constants/recruitment-requests-copy";
import { usePreferredLanguage } from "@/shared/hooks/usePreferredLanguage";
import styles from "@/features/recruitment-requests/recruitment-requests-page.module.css";

export default function RecruitmentRequestsPage() {
  const { user } = useAuth();
  const canManage = (user?.permissions || []).includes(
    "recruitment.request.manage",
  );
  const [lang, setLang] = usePreferredLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const t = RECRUITMENT_REQUEST_COPY[lang];
  const menuLabels = DASHBOARD_MENU_LABELS[lang];

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

      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} lang={lang} />

      {canManage ? (
        <HeadquartersDesk lang={lang} />
      ) : (
        <StoreRequestPanel lang={lang} />
      )}

      <footer className={styles.footer}>Since 2011 · ZHAO's Family</footer>
    </main>
  );
}
