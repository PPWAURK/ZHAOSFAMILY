"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";

import Sidebar from "@/features/dashboard/components/Sidebar";
import {
  DASHBOARD_LANGUAGES,
  DASHBOARD_MENU_LABELS,
} from "@/features/dashboard/constants/dashboard-copy";
import InventoryRow from "@/features/inventory/components/InventoryRow";
import {
  INVENTORY_COPY,
  ZHAO_BUREAU_SUPPLIER_ID,
} from "@/features/inventory/constants/inventory-copy";
import {
  createMovement,
  fetchInventory,
  fetchMovements,
} from "@/features/inventory/services/inventoryApi";
import { usePreferredLanguage } from "@/shared/hooks/usePreferredLanguage";
import styles from "@/features/inventory/inventory-page.module.css";

function formatDateTime(iso, lang) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const locale = lang === "zh" ? "zh-CN" : lang === "fr" ? "fr-FR" : "en-GB";
    return d.toLocaleString(locale, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function InventoryPage({ supplierId }) {
  const effectiveSupplierId = supplierId || ZHAO_BUREAU_SUPPLIER_ID;

  const [lang, setLang] = usePreferredLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [lines, setLines] = useState([]);
  const [movements, setMovements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submittingFor, setSubmittingFor] = useState(null);

  const t = INVENTORY_COPY[lang];
  const menuLabels = DASHBOARD_MENU_LABELS[lang];

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const [inv, mvs] = await Promise.all([
        fetchInventory(effectiveSupplierId),
        fetchMovements({ supplierId: effectiveSupplierId, limit: 50 }),
      ]);
      setLines(inv);
      setMovements(mvs);
    } catch (err) {
      setLoadError(err?.message || t.loadError);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveSupplierId, t.loadError]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleApply = useCallback(
    async (productId, { delta, reason }) => {
      setSubmittingFor(productId);
      try {
        await createMovement({ productId, delta, reason, source: "manual" });
        await refresh();
      } finally {
        setSubmittingFor(null);
      }
    },
    [refresh],
  );

  const sourceLabel = useMemo(
    () => ({
      manual: t.sourceManual,
      order: t.sourceOrder,
    }),
    [t.sourceManual, t.sourceOrder],
  );

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
            {lines.length} {t.count}
          </span>
        </p>

        {isLoading ? (
          <div className={styles.empty}>{t.loading}</div>
        ) : loadError ? (
          <div className={styles.empty}>{loadError}</div>
        ) : lines.length === 0 ? (
          <div className={styles.empty}>{t.empty}</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t.colReference}</th>
                  <th>{t.colProduct}</th>
                  <th>{t.colUnit}</th>
                  <th style={{ textAlign: "right" }}>{t.colStock}</th>
                  <th style={{ textAlign: "right" }}>{t.colActions}</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <InventoryRow
                    key={line.id}
                    line={line}
                    copy={t}
                    submitting={submittingFor === line.id}
                    onApply={(payload) => handleApply(line.id, payload)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className={styles.movementsSection}>
          <div className={styles.movementsHeader}>
            <h2 className={styles.movementsHeading}>{t.movementsHeading}</h2>
            <p className={styles.movementsHint}>{t.movementsHint}</p>
          </div>

          {isLoading ? null : movements.length === 0 ? (
            <div className={styles.empty}>{t.noMovements}</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={`${styles.table} ${styles.movementsTable}`}>
                <thead>
                  <tr>
                    <th>{t.colDate}</th>
                    <th>{t.colProduct}</th>
                    <th style={{ textAlign: "right" }}>{t.colDelta}</th>
                    <th>{t.colSource}</th>
                    <th>{t.colReason}</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => {
                    const isPositive = m.delta > 0;
                    return (
                      <tr key={m.id}>
                        <td className={styles.dateCell}>
                          {formatDateTime(m.createdAt, lang)}
                        </td>
                        <td className={styles.cellProduct}>
                          {m.productNameCn || "—"}
                          {m.productDesignationFr ? (
                            <span className={styles.cellProductSub}>
                              {m.productDesignationFr}
                            </span>
                          ) : null}
                        </td>
                        <td
                          style={{ textAlign: "right" }}
                          className={
                            isPositive
                              ? styles.deltaPositive
                              : styles.deltaNegative
                          }
                        >
                          {isPositive ? "+" : ""}
                          {m.delta}
                        </td>
                        <td>
                          <span className={styles.sourceCell}>
                            {sourceLabel[m.source] || t.sourceOther}
                          </span>
                        </td>
                        <td>{m.reason || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={styles.backRow}>
          <a href="/dashboard" className={styles.backLink}>
            ← {t.back}
          </a>
        </div>
      </motion.section>

      <footer className={styles.footer}>{t.footer}</footer>

      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} lang={lang} />
    </main>
  );
}
