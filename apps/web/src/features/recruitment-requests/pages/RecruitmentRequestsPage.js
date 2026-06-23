"use client";

import { Fragment, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/features/auth/context/AuthContext";
import Sidebar from "@/features/dashboard/components/Sidebar";
import {
  DASHBOARD_LANGUAGES,
  DASHBOARD_MENU_LABELS,
} from "@/features/dashboard/constants/dashboard-copy";
import {
  RECRUITMENT_REQUEST_COPY,
  RECRUITMENT_REQUEST_STATUSES,
} from "@/features/recruitment-requests/constants/recruitment-requests-copy";
import {
  fetchRecruitmentRequests,
  updateRecruitmentRequest,
} from "@/features/recruitment-requests/services/recruitmentRequestsApi";
import { useToast } from "@/shared/components/toast/ToastProvider";
import { usePreferredLanguage } from "@/shared/hooks/usePreferredLanguage";
import styles from "@/features/recruitment-requests/recruitment-requests-page.module.css";

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

export default function RecruitmentRequestsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const canManage = (user?.permissions || []).includes(
    "recruitment.request.manage",
  );
  const [lang, setLang] = usePreferredLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [requests, setRequests] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [savingRequestId, setSavingRequestId] = useState("");
  const t = RECRUITMENT_REQUEST_COPY[lang];
  const menuLabels = DASHBOARD_MENU_LABELS[lang];
  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      if (statusFilter === "all") {
        return true;
      }

      return request.status === statusFilter;
    });
  }, [requests, statusFilter]);

  useEffect(() => {
    let isCancelled = false;

    async function loadRequests() {
      try {
        setIsLoading(true);
        setLoadError("");
        const nextRequests = await fetchRecruitmentRequests();

        if (isCancelled) {
          return;
        }

        setRequests(nextRequests);
        setDrafts(buildDrafts(nextRequests));
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setRequests([]);
        setDrafts({});
        setLoadError(resolveErrorMessage(error, t.loadError));
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadRequests();

    return () => {
      isCancelled = true;
    };
  }, [t.loadError]);

  function buildDrafts(nextRequests) {
    return nextRequests.reduce((nextDrafts, request) => {
      nextDrafts[request.id] = {
        status: request.status,
        handledNotes: request.handledNotes || "",
      };

      return nextDrafts;
    }, {});
  }

  function patchDraft(requestId, key, value) {
    setDrafts((current) => ({
      ...current,
      [requestId]: {
        ...(current[requestId] || {}),
        [key]: value,
      },
    }));
  }

  function resetFilters() {
    setStatusFilter("all");
  }

  async function handleSave(request) {
    const requestId = String(request.id);
    const draft = drafts[request.id] || {
      status: request.status,
      handledNotes: request.handledNotes || "",
    };

    try {
      setSavingRequestId(requestId);
      const updatedRequest = await updateRecruitmentRequest(request.id, {
        status: draft.status,
        handledNotes: draft.handledNotes.trim() || undefined,
      });

      setRequests((current) =>
        current.map((item) =>
          item.id === updatedRequest.id ? updatedRequest : item,
        ),
      );
      setDrafts((current) => ({
        ...current,
        [updatedRequest.id]: {
          status: updatedRequest.status,
          handledNotes: updatedRequest.handledNotes || "",
        },
      }));
      toast.success(t.saveSuccess);
    } catch (error) {
      toast.error(resolveErrorMessage(error, t.saveError));
    } finally {
      setSavingRequestId("");
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

        <div className={styles.filters}>
          <label className={styles.filterField}>
            <span className={styles.filterLabel}>{t.filters.status}</span>
            <select
              className={styles.filterSelect}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              {RECRUITMENT_REQUEST_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status === "all" ? t.filters.all : t.statuses[status]}
                </option>
              ))}
            </select>
          </label>

          <button type="button" className={styles.btn} onClick={resetFilters}>
            {t.filters.reset}
          </button>
        </div>

        <h2 className={styles.listHeading}>
          {t.listHeading}
          <span className={styles.listHeadingCount}>
            {filteredRequests.length}
          </span>
        </h2>

        {isLoading ? <p className={styles.empty}>{t.loading}</p> : null}
        {!isLoading && loadError ? (
          <p className={styles.inlineError}>{loadError}</p>
        ) : null}

        {!isLoading && !loadError && filteredRequests.length === 0 ? (
          <p className={styles.empty}>{t.empty}</p>
        ) : null}

        {!isLoading && !loadError && filteredRequests.length > 0 ? (
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <span>{t.columns.createdAt}</span>
              <span>{t.columns.store}</span>
              <span>{t.columns.request}</span>
              <span>{t.columns.headcount}</span>
              <span>{t.columns.status}</span>
              <span>{t.columns.notes}</span>
              <span>{t.columns.actions}</span>
            </div>

            {filteredRequests.map((request) => {
              const draft = drafts[request.id] || {
                status: request.status,
                handledNotes: request.handledNotes || "",
              };
              const isSaving = savingRequestId === String(request.id);

              return (
                <article key={request.id} className={styles.row}>
                  <div className={styles.rowDate}>
                    {formatDate(request.createdAt)}
                    <span className={styles.rowId}>#{request.id}</span>
                  </div>
                  <div className={styles.rowStore}>
                    <strong>{request.restaurantName}</strong>
                    <span>
                      {t.submitterLabel}: {request.createdBy.name}
                    </span>
                  </div>
                  <div className={styles.rowRequest}>
                    <strong>{t.positions[request.position]}</strong>
                    <span>{t.contracts[request.contractType]}</span>
                  </div>
                  <div className={styles.rowHeadcount}>
                    {request.headcount} {t.peopleUnit}
                  </div>
                  <div>
                    {canManage ? (
                      <select
                        className={styles.rowSelect}
                        value={draft.status}
                        onChange={(event) =>
                          patchDraft(request.id, "status", event.target.value)
                        }
                      >
                        {RECRUITMENT_REQUEST_STATUSES.filter(
                          (status) => status !== "all",
                        ).map((status) => (
                          <option key={status} value={status}>
                            {t.statuses[status]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={styles.rowStatusBadge}>
                        {t.statuses[request.status]}
                      </span>
                    )}
                  </div>
                  <div className={styles.rowNotes}>
                    {request.notes ? <p>{request.notes}</p> : null}
                    {request.handledBy ? (
                      <small>
                        {t.handledByLabel}: {request.handledBy.name}
                      </small>
                    ) : null}
                    {canManage ? (
                      <textarea
                        placeholder={t.handledNotesPlaceholder}
                        value={draft.handledNotes}
                        onChange={(event) =>
                          patchDraft(
                            request.id,
                            "handledNotes",
                            event.target.value,
                          )
                        }
                      />
                    ) : request.handledNotes ? (
                      <small>{request.handledNotes}</small>
                    ) : null}
                  </div>
                  {canManage ? (
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        disabled={isSaving}
                        onClick={() => void handleSave(request)}
                      >
                        {isSaving ? t.saving : t.save}
                      </button>
                    </div>
                  ) : (
                    <div className={styles.rowActions} />
                  )}
                </article>
              );
            })}
          </div>
        ) : null}
      </section>

      <footer className={styles.footer}>Since 2011 · ZHAO's Family</footer>
    </main>
  );
}
