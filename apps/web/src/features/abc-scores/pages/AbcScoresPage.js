"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/features/auth/context/AuthContext";
import Sidebar from "@/features/dashboard/components/Sidebar";
import {
  DASHBOARD_LANGUAGES,
  DASHBOARD_MENU_LABELS,
} from "@/features/dashboard/constants/dashboard-copy";
import { ABC_COPY } from "@/features/abc-scores/constants/abc-copy";
import GradePreviewModal from "@/features/abc-scores/components/GradePreviewModal";
import ProgressBar from "@/features/abc-scores/components/ProgressBar";
import ScoreEditModal from "@/features/abc-scores/components/ScoreEditModal";
import StoreScoreTable from "@/features/abc-scores/components/StoreScoreTable";
import {
  createAbcCycle,
  deleteAbcCycle,
  fetchAbcCycle,
  fetchAbcCycles,
  fetchAbcGradeDirectory,
  publishAbcCycle,
  recordAbcInspection,
  uploadAbcReport,
} from "@/features/abc-scores/services/abcScoresApi";
import { useConfirm } from "@/shared/components/confirm/ConfirmProvider";
import { useToast } from "@/shared/components/toast/ToastProvider";
import { usePreferredLanguage } from "@/shared/hooks/usePreferredLanguage";
import styles from "@/features/abc-scores/abc-scores-page.module.css";

const EMPTY_DRAFT = { notes: "", grade: "" };

export default function AbcScoresPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const [lang, setLang] = usePreferredLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cycles, setCycles] = useState([]);
  const [currentCycleId, setCurrentCycleId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createLabel, setCreateLabel] = useState("");
  const [creating, setCreating] = useState(false);

  const [editState, setEditState] = useState(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [uploadingFor, setUploadingFor] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const t = ABC_COPY[lang];
  const menuLabels = DASHBOARD_MENU_LABELS[lang];
  const permissions = user?.permissions || [];
  const canManage = permissions.includes("abc.inspection.manage");
  const canPublish = permissions.includes("abc.inspection.publish");
  const isDraft = detail?.status === "draft";

  const loadCycles = useCallback(async () => {
    const nextCycles = await fetchAbcCycles();
    setCycles(nextCycles);
    setCurrentCycleId((current) => {
      if (current && nextCycles.some((cycle) => cycle.id === current)) {
        return current;
      }
      const draftCycle = nextCycles.find((cycle) => cycle.status === "draft");
      return (draftCycle ?? nextCycles[0])?.id ?? null;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        setIsLoading(true);
        setError("");
        await loadCycles();
      } catch (loadErr) {
        if (!cancelled) {
          setError(loadErr instanceof Error ? loadErr.message : t.loadError);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [loadCycles, t.loadError]);

  const refreshDetail = useCallback(async (cycleId) => {
    if (!cycleId) {
      setDetail(null);
      return;
    }
    const nextDetail = await fetchAbcCycle(cycleId);
    setDetail(nextDetail);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDetail() {
      if (!currentCycleId) {
        setDetail(null);
        return;
      }
      try {
        setError("");
        const nextDetail = await fetchAbcCycle(currentCycleId);
        if (!cancelled) {
          setDetail(nextDetail);
        }
      } catch (loadErr) {
        if (!cancelled) {
          setError(loadErr instanceof Error ? loadErr.message : t.loadError);
        }
      }
    }

    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [currentCycleId, t.loadError]);

  async function handleCreateCycle(event) {
    event.preventDefault();
    if (!createLabel.trim()) {
      return;
    }
    setCreating(true);
    try {
      const cycle = await createAbcCycle({ label: createLabel.trim() });
      setCreateOpen(false);
      setCreateLabel("");
      await loadCycles();
      setCurrentCycleId(cycle.id);
    } catch (createErr) {
      setError(createErr instanceof Error ? createErr.message : t.saveError);
    } finally {
      setCreating(false);
    }
  }

  function openEdit(restaurantId, current) {
    setEditState({ restaurantId });
    setDraft({
      notes: current.notes ?? "",
      grade: current.grade ?? "",
    });
    setEditError("");
  }

  async function submitEdit() {
    if (!editState || !currentCycleId) {
      return;
    }
    if (!draft.grade) {
      setEditError(t.saveError);
      return;
    }
    setSaving(true);
    setEditError("");
    try {
      await recordAbcInspection(currentCycleId, editState.restaurantId, {
        grade: draft.grade,
        notes: draft.notes || undefined,
      });
      await refreshDetail(currentCycleId);
      setEditState(null);
      setDraft(EMPTY_DRAFT);
    } catch (saveErr) {
      setEditError(saveErr instanceof Error ? saveErr.message : t.saveError);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(restaurantId, file) {
    if (!currentCycleId) {
      return;
    }
    setUploadingFor(restaurantId);
    setError("");
    try {
      await uploadAbcReport(currentCycleId, restaurantId, file);
      await refreshDetail(currentCycleId);
    } catch (uploadErr) {
      setError(uploadErr instanceof Error ? uploadErr.message : t.saveError);
    } finally {
      setUploadingFor(null);
    }
  }

  async function handlePublish() {
    if (!currentCycleId || !(await confirm(t.publishConfirm))) {
      return;
    }
    setPublishing(true);
    try {
      await publishAbcCycle(currentCycleId);
      await loadCycles();
      await refreshDetail(currentCycleId);
      toast.success(t.publishSuccess);
    } catch (publishErr) {
      toast.error(publishErr instanceof Error ? publishErr.message : t.saveError);
    } finally {
      setPublishing(false);
    }
  }

  async function handlePreview() {
    if (!currentCycleId) {
      return;
    }

    try {
      setPreview(await fetchAbcGradeDirectory(currentCycleId));
      setPreviewOpen(true);
    } catch (previewErr) {
      setError(previewErr instanceof Error ? previewErr.message : t.loadError);
    }
  }

  async function handleDelete() {
    if (!currentCycleId || !(await confirm({ message: t.deleteConfirm, tone: "danger" }))) {
      return;
    }
    setDeleting(true);
    try {
      await deleteAbcCycle(currentCycleId);
      // 删除当前周期后，loadCycles 会自动改选剩余周期（或清空）。
      await loadCycles();
      toast.success(t.deleteSuccess);
    } catch (deleteErr) {
      toast.error(deleteErr instanceof Error ? deleteErr.message : t.saveError);
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
            className={styles.menuToggle}
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
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

      <section className={styles.main}>
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

        {isLoading ? <div className={styles.statePanel}>{t.loading}</div> : null}

        {!isLoading && error ? (
          <div className={styles.statePanel} role="alert">
            {error}
          </div>
        ) : null}

        {!isLoading && cycles.length === 0 ? (
          <div className={styles.statePanel}>{t.noCycle}</div>
        ) : null}

        {!isLoading && detail ? (
          <>
            <div className={styles.cycleBar}>
              <div className={styles.cycleIdentity}>
                <span className={styles.cycleLabel}>{t.cycleLabel}</span>
                <div className={styles.cycleSelectRow}>
                  <select
                    className={styles.cycleSelect}
                    value={currentCycleId ?? ""}
                    onChange={(event) => setCurrentCycleId(Number(event.target.value))}
                  >
                    {cycles.map((cycle) => (
                      <option key={cycle.id} value={cycle.id}>
                        {cycle.label}
                      </option>
                    ))}
                  </select>
                  <span
                    className={`${styles.cycleStatus} ${
                      detail.status === "published" ? styles.cycleStatusPublished : ""
                    }`}
                  >
                    {detail.status === "published" ? t.statusPublished : t.statusDraft}
                  </span>
                </div>
              </div>

              <div className={styles.progressGroup}>
                <ProgressBar
                  label={t.progressInspections}
                  filled={detail.progress.filled}
                  total={detail.progress.total}
                  styles={styles}
                />
              </div>

              <div className={styles.cycleActions}>
                {canPublish ? (
                  <button
                    type="button"
                    className={styles.ghostButton}
                    onClick={() => setCreateOpen(true)}
                  >
                    {t.createCycle}
                  </button>
                ) : null}
                {isDraft ? (
                  <button type="button" className={styles.ghostButton} onClick={handlePreview}>
                    {t.preview}
                  </button>
                ) : null}
                {canPublish && isDraft ? (
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={handlePublish}
                    disabled={publishing}
                  >
                    {t.publish}
                  </button>
                ) : null}
                {canPublish ? (
                  <button
                    type="button"
                    className={styles.dangerButton}
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {t.deleteCycle}
                  </button>
                ) : null}
              </div>

              {!isDraft ? <p className={styles.publishedHint}>{t.publishedHint}</p> : null}
            </div>

            <StoreScoreTable
              stores={detail.stores}
              t={t}
              styles={styles}
              canManage={canManage}
              isDraft={isDraft}
              onEdit={openEdit}
              onUpload={handleUpload}
              uploadingFor={uploadingFor}
            />
          </>
        ) : null}

        {!isLoading && canPublish && cycles.length === 0 ? (
          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => setCreateOpen(true)}
            >
              {t.createCycle}
            </button>
          </div>
        ) : null}

        <div className={styles.backRow}>
          <Link href="/dashboard" className={styles.backLink}>
            ← {t.back}
          </Link>
        </div>
      </section>

      <footer className={styles.footer}>{t.footer}</footer>

      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} lang={lang} />

      <ScoreEditModal
        open={Boolean(editState)}
        t={t}
        styles={styles}
        draft={draft}
        onChange={(key, value) => setDraft((current) => ({ ...current, [key]: value }))}
        onSubmit={submitEdit}
        onClose={() => {
          setEditState(null);
          setDraft(EMPTY_DRAFT);
          setEditError("");
        }}
        saving={saving}
        error={editError}
      />

      <GradePreviewModal
        open={previewOpen}
        directory={preview}
        t={t}
        styles={styles}
        onClose={() => setPreviewOpen(false)}
      />

      {createOpen ? (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !creating) {
              setCreateOpen(false);
            }
          }}
        >
          <form className={styles.modalPanel} onSubmit={handleCreateCycle}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{t.createCycle}</h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setCreateOpen(false)}
                disabled={creating}
                aria-label={t.cancel}
              >
                ×
              </button>
            </div>
            <label className={styles.formField}>
              <span>{t.cycleLabel}</span>
              <input
                value={createLabel}
                placeholder={t.createCyclePlaceholder}
                disabled={creating}
                onChange={(event) => setCreateLabel(event.target.value)}
              />
            </label>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.ghostButton}
                onClick={() => setCreateOpen(false)}
                disabled={creating}
              >
                {t.cancel}
              </button>
              <button type="submit" className={styles.primaryButton} disabled={creating}>
                {t.create}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}
