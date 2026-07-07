"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { RECRUITMENT_REQUEST_COPY } from "@/features/recruitment-requests/constants/recruitment-requests-copy";
import {
  batchDeleteRecruitmentRequests,
  createRecruitmentRequest,
  deleteRecruitmentRequest,
  fetchRecruitmentRequests,
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

const RECRUITMENT_POSITIONS = ["waiter", "chef", "kitchen_assistant"];
const RECRUITMENT_CONTRACT_TYPES = ["full_time", "part_time"];

const DEFAULT_FORM = {
  position: RECRUITMENT_POSITIONS[0],
  contractType: RECRUITMENT_CONTRACT_TYPES[0],
  headcount: "1",
  notes: "",
};

export default function StoreRequestPanel({ lang }) {
  const toast = useToast();
  const t = RECRUITMENT_REQUEST_COPY[lang];
  const send = t.send;
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const selectAllRef = useRef(null);
  const sortedRequests = useMemo(
    () =>
      [...requests].sort((a, b) =>
        a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0,
      ),
    [requests],
  );

  useEffect(() => {
    let isCancelled = false;

    async function loadRequests() {
      try {
        setIsLoading(true);
        setLoadError("");
        const nextRequests = await fetchRecruitmentRequests();

        if (!isCancelled) {
          setRequests(nextRequests);
        }
      } catch (error) {
        if (!isCancelled) {
          setRequests([]);
          setLoadError(resolveErrorMessage(error, t.loadError));
        }
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

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        selectedIds.length > 0 && selectedIds.length < sortedRequests.length;
    }
  }, [selectedIds, sortedRequests.length]);

  function patchForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const headcount = Number(form.headcount);

    if (!Number.isInteger(headcount) || headcount < 1) {
      toast.error(send.requiredError);
      return;
    }

    try {
      setIsSubmitting(true);
      const createdRequest = await createRecruitmentRequest({
        position: form.position,
        contractType: form.contractType,
        headcount,
        notes: form.notes.trim() || undefined,
      });

      setRequests((current) => [createdRequest, ...current]);
      setForm(DEFAULT_FORM);
      toast.success(send.submitSuccess);
    } catch (error) {
      toast.error(resolveErrorMessage(error, send.submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  function toggleSelect(requestId) {
    setSelectedIds((current) =>
      current.includes(requestId)
        ? current.filter((id) => id !== requestId)
        : [...current, requestId],
    );
  }

  function toggleSelectAll() {
    setSelectedIds((current) =>
      current.length === sortedRequests.length
        ? []
        : sortedRequests.map((r) => r.id),
    );
  }

  async function handleBatchDelete() {
    if (selectedIds.length === 0) return;

    const confirmed = window.confirm(
      send.deleteSelectedConfirm.replace("{count}", selectedIds.length),
    );

    if (!confirmed) return;

    try {
      setIsBatchDeleting(true);
      const { deletedCount } = await batchDeleteRecruitmentRequests(selectedIds);
      setRequests((current) =>
        current.filter((item) => !selectedIds.includes(item.id)),
      );
      setSelectedIds([]);
      toast.success(
        send.deleteSelectedSuccess.replace("{count}", String(deletedCount)),
      );
    } catch (error) {
      toast.error(resolveErrorMessage(error, send.deleteSelectedError));
    } finally {
      setIsBatchDeleting(false);
    }
  }

  async function handleDelete(request) {
    const requestId = String(request.id);

    try {
      setDeletingId(requestId);
      await deleteRecruitmentRequest(request.id);
      setRequests((current) =>
        current.filter((item) => item.id !== request.id),
      );
      toast.success(send.deleteSuccess);
    } catch (error) {
      toast.error(resolveErrorMessage(error, send.deleteError));
    } finally {
      setDeletingId("");
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
        <span>{send.titleAccent}</span>
      </h1>
      <p className={styles.lede}>{send.lede}</p>

      <form className={styles.form} onSubmit={handleSubmit}>
        <p className={styles.formTitle}>{send.formTitle}</p>

        <div className={styles.formGrid}>
          <label className={styles.filterField}>
            <span className={styles.filterLabel}>{send.positionLabel}</span>
            <select
              className={styles.filterSelect}
              value={form.position}
              onChange={(event) => patchForm("position", event.target.value)}
            >
              {RECRUITMENT_POSITIONS.map((position) => (
                <option key={position} value={position}>
                  {t.positions[position]}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.filterField}>
            <span className={styles.filterLabel}>{send.contractLabel}</span>
            <select
              className={styles.filterSelect}
              value={form.contractType}
              onChange={(event) =>
                patchForm("contractType", event.target.value)
              }
            >
              {RECRUITMENT_CONTRACT_TYPES.map((contractType) => (
                <option key={contractType} value={contractType}>
                  {t.contracts[contractType]}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.filterField}>
            <span className={styles.filterLabel}>{send.headcountLabel}</span>
            <input
              className={styles.formInput}
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={form.headcount}
              onChange={(event) =>
                patchForm("headcount", event.target.value.replace(/[^\d]/g, ""))
              }
            />
          </label>
        </div>

        <label className={styles.filterField}>
          <span className={styles.filterLabel}>{send.notesLabel}</span>
          <textarea
            className={`${styles.formInput} ${styles.formNotes}`}
            placeholder={send.notesPlaceholder}
            value={form.notes}
            onChange={(event) => patchForm("notes", event.target.value)}
          />
        </label>

        <div className={styles.formActions}>
          <button
            type="submit"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? send.submitting : send.submit}
          </button>
        </div>
      </form>

      <h2 className={styles.listHeading}>
        {send.listHeading}
        <span className={styles.listHeadingCount}>{sortedRequests.length}</span>
      </h2>

      {isLoading ? <p className={styles.empty}>{t.loading}</p> : null}
      {!isLoading && loadError ? (
        <p className={styles.inlineError}>{loadError}</p>
      ) : null}

      {!isLoading && !loadError && sortedRequests.length === 0 ? (
        <p className={styles.empty}>{send.empty}</p>
      ) : null}

      {!isLoading && !loadError && sortedRequests.length > 0 ? (
        <>
          <div className={styles.sendToolbar}>
            <label className={styles.sendCardCheck}>
              <input
                ref={selectAllRef}
                type="checkbox"
                className={styles.sendCheckbox}
                checked={
                  selectedIds.length > 0 &&
                  selectedIds.length === sortedRequests.length
                }
                onChange={toggleSelectAll}
              />
            </label>

            {selectedIds.length > 0 ? (
              <span className={styles.sendToolbarCount}>
                {send.selectAll}: {selectedIds.length}/{sortedRequests.length}
              </span>
            ) : null}

            {selectedIds.length > 0 ? (
              <>
                <button
                  type="button"
                  className={styles.sendDeleteBatch}
                  disabled={isBatchDeleting}
                  onClick={() => void handleBatchDelete()}
                >
                  {isBatchDeleting
                    ? send.deleting
                    : `${send.deleteSelected} (${selectedIds.length})`}
                </button>
                <button
                  type="button"
                  className={styles.sendDeleteBatchCancel}
                  onClick={() => setSelectedIds([])}
                >
                  {t.filters.reset}
                </button>
              </>
            ) : null}
          </div>

          <div className={styles.sendList}>
            {sortedRequests.map((request) => {
              const isDeleting = deletingId === String(request.id);
              const isSelected = selectedIds.includes(request.id);

              return (
                <article
                  key={request.id}
                  className={`${styles.sendCard} ${
                    isSelected ? styles.sendCardSelected : ""
                  }`}
                >
                  <label className={styles.sendCardCheck}>
                    <input
                      type="checkbox"
                      className={styles.sendCheckbox}
                      checked={isSelected}
                      onChange={() => toggleSelect(request.id)}
                    />
                  </label>

                  <div className={styles.sendCardBody}>
                    <span className={styles.sendCardTitle}>
                      {t.positions[request.position]} ·{" "}
                      {t.contracts[request.contractType]}
                    </span>
                    <span className={styles.sendCardMeta}>
                      {request.headcount} {t.peopleUnit} ·{" "}
                      {formatDate(request.createdAt)} · #{request.id}
                    </span>
                    <span className={styles.sendCardMeta}>
                      {t.columns.status}: {t.statuses[request.status]}
                    </span>
                    {request.notes ? (
                      <p className={styles.sendCardNotes}>{request.notes}</p>
                    ) : null}
                    {request.handledNotes ? (
                      <p className={styles.sendCardNotes}>
                        {send.handledNotesLabel}: {request.handledNotes}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className={styles.sendDelete}
                    disabled={isDeleting || isBatchDeleting}
                    onClick={() => void handleDelete(request)}
                  >
                    {isDeleting ? send.deleting : send.delete}
                  </button>
                </article>
              );
            })}
          </div>
        </>
      ) : null}
    </section>
  );
}
