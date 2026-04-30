"use client";

import { Fragment, useEffect, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";

import Sidebar from "@/features/dashboard/components/Sidebar";
import {
  DASHBOARD_LANGUAGES,
  DASHBOARD_MENU_LABELS,
} from "@/features/dashboard/constants/dashboard-copy";
import StoreCard from "@/features/stores/components/StoreCard";
import {
  STORES_COPY,
} from "@/features/stores/constants/stores-copy";
import { fetchStoresPageStores } from "@/features/stores/services/restaurantsApi";
import styles from "@/features/stores/stores-page.module.css";

export default function StoresPage() {
  const [lang, setLang] = useState("zh");
  const [menuOpen, setMenuOpen] = useState(false);
  const [stores, setStores] = useState([]);
  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const [storesError, setStoresError] = useState("");
  const t = STORES_COPY[lang];
  const menuLabels = DASHBOARD_MENU_LABELS[lang];
  const count = stores.length;
  const countLabel = count > 1 ? t.countPlural : t.countSingular;

  useEffect(() => {
    let isCancelled = false;

    async function loadStores() {
      try {
        setIsLoadingStores(true);
        setStoresError("");
        const nextStores = await fetchStoresPageStores();

        if (isCancelled) {
          return;
        }

        setStores(nextStores);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setStores([]);
        setStoresError(error instanceof Error ? error.message : t.loadError);
      } finally {
        if (!isCancelled) {
          setIsLoadingStores(false);
        }
      }
    }

    void loadStores();

    return () => {
      isCancelled = true;
    };
  }, [t.loadError]);

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

        <p className={styles.listHeading}>
          <span>{t.listHeading}</span>
          <span className={styles.listHeadingCount}>
            {count} {countLabel}
          </span>
        </p>

        {isLoadingStores ? (
          <div className={styles.statePanel}>{t.loading}</div>
        ) : null}

        {!isLoadingStores && storesError ? (
          <div className={styles.statePanel} role="alert">
            {storesError}
          </div>
        ) : null}

        {!isLoadingStores && !storesError && stores.length === 0 ? (
          <div className={styles.statePanel}>{t.empty}</div>
        ) : null}

        {!isLoadingStores && !storesError && stores.length > 0 ? (
          <div className={styles.grid}>
            {stores.map((store, index) => (
              <StoreCard
                key={store.id}
                store={store}
                index={index}
                lang={lang}
                labels={t}
              />
            ))}
          </div>
        ) : null}

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
