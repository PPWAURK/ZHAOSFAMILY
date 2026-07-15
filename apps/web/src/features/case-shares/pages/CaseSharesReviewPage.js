"use client";

import { Fragment, useEffect, useState } from "react";

import { useAuth } from "@/features/auth/context/AuthContext";
import Sidebar from "@/features/dashboard/components/Sidebar";
import {
  DASHBOARD_LANGUAGES,
  DASHBOARD_MENU_LABELS,
} from "@/features/dashboard/constants/dashboard-copy";
import { CASE_SHARES_REVIEW_COPY } from "@/features/case-shares/constants/case-shares-copy";
import {
  fetchPendingCaseShares,
  reviewCaseShare,
} from "@/features/case-shares/services/caseSharesApi";
import { MediaImage } from "@/shared/components/media/MediaImage";
import { useToast } from "@/shared/components/toast/ToastProvider";
import { usePreferredLanguage } from "@/shared/hooks/usePreferredLanguage";
import styles from "@/features/case-shares/case-shares-review-page.module.css";

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value || "-";
  }

  return date.toISOString().slice(0, 10);
}

function resolveErrorMessage(error, fallbackMessage) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

export default function CaseSharesReviewPage() {
  const { user } = useAuth();
  const toast = useToast();
  const canReview = (user?.permissions || []).includes("case.share.review");
  const [lang, setLang] = usePreferredLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cases, setCases] = useState([]);
  const [notes, setNotes] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [pendingId, setPendingId] = useState("");
  const t = CASE_SHARES_REVIEW_COPY[lang];
  const menuLabels = DASHBOARD_MENU_LABELS[lang];

  useEffect(() => {
    if (!canReview) {
      setIsLoading(false);
      return undefined;
    }

    let isCancelled = false;

    async function loadCases() {
      try {
        setIsLoading(true);
        setLoadError("");
        const nextCases = await fetchPendingCaseShares();

        if (!isCancelled) {
          setCases(nextCases);
        }
      } catch (error) {
        if (!isCancelled) {
          setCases([]);
          setLoadError(resolveErrorMessage(error, t.loadError));
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadCases();

    return () => {
      isCancelled = true;
    };
  }, [canReview, t.loadError]);

  function patchNote(caseId, value) {
    setNotes((current) => ({ ...current, [caseId]: value }));
  }

  function removeCase(caseId) {
    setCases((current) => current.filter((item) => item.id !== caseId));
    setNotes((current) => {
      const next = { ...current };
      delete next[caseId];
      return next;
    });
  }

  async function handleReview(caseItem, status) {
    const note = (notes[caseItem.id] || "").trim();

    if (status === "rejected" && !note) {
      toast.error(t.rejectNoteRequired);
      return;
    }

    try {
      setPendingId(`${caseItem.id}:${status}`);
      await reviewCaseShare(caseItem.id, {
        status,
        reviewNote: note || undefined,
      });
      removeCase(caseItem.id);
      toast.success(status === "approved" ? t.approveSuccess : t.rejectSuccess);
    } catch (error) {
      toast.error(resolveErrorMessage(error, t.reviewError));
    } finally {
      setPendingId("");
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

      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} lang={lang} />

      <section className={styles.main}>
        <p className={styles.kicker}>
          <span className={styles.kickerDot} />
          {t.kicker}
        </p>

        <h1 className={styles.title}>
          {t.title}
          <span>{t.titleAccent}</span>
        </h1>
        <p className={styles.lede}>{t.lede}</p>

        {!canReview ? <p className={styles.empty}>{t.noAccess}</p> : null}

        {canReview ? (
          <>
            <h2 className={styles.listHeading}>
              {t.listHeading}
              <span className={styles.listHeadingCount}>{cases.length}</span>
            </h2>

            {isLoading ? <p className={styles.empty}>{t.loading}</p> : null}
            {!isLoading && loadError ? (
              <p className={styles.inlineError}>{loadError}</p>
            ) : null}
            {!isLoading && !loadError && cases.length === 0 ? (
              <p className={styles.empty}>{t.empty}</p>
            ) : null}

            {!isLoading && !loadError && cases.length > 0 ? (
              <div className={styles.list}>
                {cases.map((caseItem) => {
                  const note = notes[caseItem.id] || "";
                  const isApproving = pendingId === `${caseItem.id}:approved`;
                  const isRejecting = pendingId === `${caseItem.id}:rejected`;
                  const isBusy = isApproving || isRejecting;

                  return (
                    <article key={caseItem.id} className={styles.card}>
                      <div className={styles.cardHead}>
                        <span className={styles.typeBadge}>
                          {t.typeLabels[caseItem.type]}
                        </span>
                        <span className={styles.cardDate}>
                          {formatDate(caseItem.createdAt)}
                          <span className={styles.cardId}>#{caseItem.id}</span>
                        </span>
                      </div>

                      <p className={styles.cardMeta}>
                        {t.submitterLabel}: {caseItem.author.name} ·{" "}
                        {t.storeLabel}: {caseItem.restaurant.name}
                      </p>

                      <p className={styles.cardContent}>{caseItem.content}</p>

                      {caseItem.image ? (
                        <MediaImage
                          className={styles.cardImage}
                          objectKey={caseItem.image.objectKey}
                          alt={caseItem.image.name}
                        />
                      ) : null}

                      <label className={styles.noteField}>
                        <span className={styles.noteLabel}>
                          {t.reviewNoteLabel}
                        </span>
                        <textarea
                          className={styles.noteInput}
                          placeholder={t.reviewNotePlaceholder}
                          value={note}
                          onChange={(event) =>
                            patchNote(caseItem.id, event.target.value)
                          }
                        />
                      </label>

                      <div className={styles.cardActions}>
                        <button
                          type="button"
                          className={`${styles.btn} ${styles.btnPrimary}`}
                          disabled={isBusy}
                          onClick={() => void handleReview(caseItem, "approved")}
                        >
                          {isApproving ? t.approving : t.approve}
                        </button>
                        <button
                          type="button"
                          className={`${styles.btn} ${styles.btnDanger}`}
                          disabled={isBusy}
                          onClick={() => void handleReview(caseItem, "rejected")}
                        >
                          {isRejecting ? t.rejecting : t.reject}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}
          </>
        ) : null}
      </section>

      <footer className={styles.footer}>Since 2011 · ZHAO&apos;s Family</footer>
    </main>
  );
}
