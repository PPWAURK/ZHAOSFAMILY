"use client";

import { useEffect, useMemo, useState } from "react";

import {
  RECRUITMENT_REQUEST_COPY,
  RECRUITMENT_REQUEST_STATUSES,
} from "@/features/recruitment-requests/constants/recruitment-requests-copy";
import {
  fetchRecruitmentRequests,
  updateRecruitmentRequest,
} from "@/features/recruitment-requests/services/recruitmentRequestsApi";
import { useToast } from "@/shared/components/toast/ToastProvider";
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

function buildDrafts(nextRequests) {
  return nextRequests.reduce((nextDrafts, request) => {
    nextDrafts[request.id] = {
      status: request.status,
      handledNotes: request.handledNotes || "",
    };

    return nextDrafts;
  }, {});
}

export default function HeadquartersDesk({ lang }) {
  const toast = useToast();
  const t = RECRUITMENT_REQUEST_COPY[lang];
  const [statusFilter, setStatusFilter] = useState("all");
  const [requests, setRequests] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [savingRequestId, setSavingRequestId] = useState("");
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

  function patchDraft(requestId, key, value) {
    setDrafts((current) => ({
      ...current,
      [requestId]: {
        ...(current[requestId] || {}),
        [key]: value,
      },
    }));
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

        <button
          type="button"
          className={styles.btn}
          onClick={() => setStatusFilter("all")}
        >
          {t.filters.reset}
        </button>
      </div>

      <h2 className={styles.listHeading}>
        {t.listHeading}
        <span className={styles.listHeadingCount}>{filteredRequests.length}</span>
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
                </div>
                <div className={styles.rowNotes}>
                  {request.notes ? <p>{request.notes}</p> : null}
                  {request.handledBy ? (
                    <small>
                      {t.handledByLabel}: {request.handledBy.name}
                    </small>
                  ) : null}
                  <textarea
                    placeholder={t.handledNotesPlaceholder}
                    value={draft.handledNotes}
                    onChange={(event) =>
                      patchDraft(request.id, "handledNotes", event.target.value)
                    }
                  />
                </div>
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
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
