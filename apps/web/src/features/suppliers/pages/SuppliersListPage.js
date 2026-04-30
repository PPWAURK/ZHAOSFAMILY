"use client";

import { Fragment, useMemo, useState } from "react";
import { motion } from "motion/react";

import Sidebar from "@/features/dashboard/components/Sidebar";
import {
  DASHBOARD_LANGUAGES,
  DASHBOARD_MENU_LABELS,
} from "@/features/dashboard/constants/dashboard-copy";
import ConfirmDialog from "@/features/suppliers/components/ConfirmDialog";
import SupplierForm from "@/features/suppliers/components/SupplierForm";
import { SUPPLIERS_COPY } from "@/features/suppliers/constants/suppliers-copy";
import { useSuppliersList } from "@/features/suppliers/store/suppliersStore";
import styles from "@/features/suppliers/suppliers-page.module.css";

export default function SuppliersListPage() {
  const [lang, setLang] = useState("zh");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [pageError, setPageError] = useState("");

  const t = SUPPLIERS_COPY[lang];
  const menuLabels = DASHBOARD_MENU_LABELS[lang];

  const {
    suppliers,
    productCounts,
    isLoading,
    error,
    addSupplier,
    removeSupplier,
  } = useSuppliersList();

  const sorted = useMemo(
    () =>
      [...suppliers].sort(
        (a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0),
      ),
    [suppliers],
  );

  async function handleCreate(data) {
    setSubmitting(true);
    setPageError("");
    try {
      await addSupplier(data);
      setShowForm(false);
    } catch (err) {
      setPageError(err?.message || t.saveError);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setPageError("");
    try {
      await removeSupplier(pendingDelete.id);
      setPendingDelete(null);
    } catch (err) {
      setPageError(err?.message || t.deleteError);
    } finally {
      setDeleting(false);
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

        <div className={styles.toolbar}>
          <p className={styles.listHeading} style={{ flex: 1 }}>
            <span>{t.listHeading}</span>
            <span className={styles.listHeadingCount}>
              {sorted.length} {t.count}
            </span>
          </p>
          <div className={styles.toolbarRight}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => setShowForm((v) => !v)}
              disabled={isLoading}
            >
              {showForm ? t.cancel : t.addSupplier}
            </button>
          </div>
        </div>

        {pageError ? (
          <div className={styles.notFound} style={{ marginBottom: 16 }}>
            {pageError}
          </div>
        ) : null}

        {showForm ? (
          <SupplierForm
            copy={t}
            submitting={submitting}
            onCancel={() => setShowForm(false)}
            onSubmit={handleCreate}
          />
        ) : null}

        {isLoading ? (
          <div className={styles.notFound}>{t.loading}</div>
        ) : error ? (
          <div className={styles.notFound}>{t.loadError}</div>
        ) : (
          <div className={styles.grid}>
            {sorted.map((supplier, index) => {
              const count = productCounts[supplier.id] ?? 0;
              return (
                <motion.div
                  key={supplier.id}
                  className={styles.card}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.35,
                    delay: Math.min(index * 0.04, 0.2),
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <div className={styles.cardTop}>
                    <span className={styles.cardIndex}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={`${styles.cardPill} ${supplier.includeAllProductsInOrder ? styles.cardPillOn : ""}`}
                    >
                      {supplier.includeAllProductsInOrder
                        ? t.truePill
                        : t.falsePill}{" "}
                      · ALL
                    </span>
                  </div>

                  <h3 className={styles.cardName}>{supplier.name}</h3>

                  <dl className={styles.cardMeta}>
                    <div className={styles.cardMetaRow}>
                      <dt>{t.fieldSortOrder}</dt>
                      <dd>{supplier.sortOrder}</dd>
                    </div>
                    <div className={styles.cardMetaRow}>
                      <dt>{t.productsHeading}</dt>
                      <dd>
                        {count} {t.productsCount}
                      </dd>
                    </div>
                  </dl>

                  <div className={styles.cardActions}>
                    <a
                      href={`/dashboard/suppliers?id=${encodeURIComponent(supplier.id)}`}
                      className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`}
                    >
                      {t.open}
                    </a>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`}
                      onClick={() => setPendingDelete(supplier)}
                    >
                      {t.deleteBtn}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        <div className={styles.backRow}>
          <a href="/dashboard" className={styles.backLink}>
            ← {t.back}
          </a>
        </div>
      </motion.section>

      <footer className={styles.footer}>{t.footer}</footer>

      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} lang={lang} />

      <ConfirmDialog
        open={!!pendingDelete}
        message={
          pendingDelete
            ? t.confirmDeleteSupplier.replace("{name}", pendingDelete.name)
            : ""
        }
        confirmLabel={deleting ? t.deleting : t.yes}
        cancelLabel={t.no}
        onConfirm={handleConfirmDelete}
        onCancel={() => (deleting ? null : setPendingDelete(null))}
      />
    </main>
  );
}
