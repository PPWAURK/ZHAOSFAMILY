"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  BadgeStatus,
  EmployeeTrainingBadge,
  TrainingBadgeDefinition,
} from "@/types/trainingBadge";
import { TrainingBadgeSvg } from "@/components/training-badges/TrainingBadgeSvg";
import { API_URL, buildBadgeImageUrl, getAccessToken } from "@/shared/api/api-client";
import styles from "@/components/training-badges/training-badges.module.css";

export interface TrainingBadgeDetailLabels {
  close: string;
  progress: string;
  score: string;
  requiredScore: string;
  requiredTraining: string;
  requiredAssessment: string;
  certifiedAt: string;
  expiresAt: string;
  level: string;
}

export interface TrainingBadgeDetailModalProps {
  open: boolean;
  badge: TrainingBadgeDefinition | null;
  employeeBadge: EmployeeTrainingBadge | null;
  label: string;
  description?: string;
  unlockHint?: string;
  statusLabel: string;
  labels: TrainingBadgeDetailLabels;
  getStatusLabel: (status: BadgeStatus) => string;
  onClose: () => void;
}

function joinIds(ids: readonly string[]): string {
  return ids.length > 0 ? ids.join(", ") : "-";
}

export function TrainingBadgeDetailModal({
  open,
  badge,
  employeeBadge,
  label,
  description,
  unlockHint,
  statusLabel,
  labels,
  onClose,
}: TrainingBadgeDetailModalProps) {
  const [svgFiles, setSvgFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !badge) return;

    setSelectedFile(badge.imageFileName ?? null);

    fetch(`${API_URL}/training/badges/svg-files`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then(setSvgFiles)
      .catch(() => {});
  }, [open, badge]);

  const handleSelect = useCallback(
    async (fileName: string) => {
      if (!badge || saving) return;

      setSaving(true);
      setSelectedFile(fileName);

      try {
        const token = getAccessToken();
        const res = await fetch(
          `${API_URL}/training/badges/${badge.id}/image`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            credentials: "include",
            body: JSON.stringify({ imageFileName: fileName }),
          },
        );

        if (!res.ok) {
          setSelectedFile(badge.imageFileName ?? null);
        }
      } catch {
        setSelectedFile(badge.imageFileName ?? null);
      } finally {
        setSaving(false);
      }
    },
    [badge, saving],
  );

  if (!open || !badge || !employeeBadge) {
    return null;
  }

  return (
    <div className={styles.modalBackdrop} role="presentation" onClick={onClose}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.modalHeader}>
          <TrainingBadgeSvg
            track={badge.track}
            rarity={badge.rarity}
            iconType={badge.iconType}
            status={employeeBadge.status}
            progress={employeeBadge.completionRate}
            size="lg"
            stableId={`${badge.id}-detail`}
            imageFileName={selectedFile ?? badge.imageFileName}
          />
          <div>
            <p className={styles.meta}>{statusLabel}</p>
            <h2 className={styles.label}>{label}</h2>
            {description ? <p className={styles.description}>{description}</p> : null}
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label={labels.close}>
            ×
          </button>
        </header>

        {svgFiles.length > 0 && (
          <details className={styles.svgPickerSection}>
            <summary className={styles.svgPickerSummary}>
              Change image {selectedFile ? `(${selectedFile})` : ""}
            </summary>
            <div className={styles.svgPickerGrid}>
              {svgFiles.map((file) => {
                const isSelected = file === selectedFile;
                return (
                  <button
                    key={file}
                    type="button"
                    className={`${styles.svgPickerItem} ${isSelected ? styles.svgPickerItemActive : ""}`}
                    disabled={saving}
                    onClick={() => handleSelect(file)}
                    title={file}
                  >
                    <img src={buildBadgeImageUrl(file)} alt={file} />
                    <span>{file}</span>
                  </button>
                );
              })}
            </div>
          </details>
        )}

        <div className={styles.modalContent}>
          {unlockHint ? <p className={styles.description}>{unlockHint}</p> : null}
          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <span className={styles.statLabel}>{labels.progress}</span>
              <span className={styles.statValue}>
                {employeeBadge.progress}/{employeeBadge.maxProgress}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.statLabel}>{labels.score}</span>
              <span className={styles.statValue}>{employeeBadge.score ?? "-"}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.statLabel}>{labels.requiredScore}</span>
              <span className={styles.statValue}>{badge.requiredScore ?? 80}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.statLabel}>{labels.level}</span>
              <span className={styles.statValue}>{badge.level ?? "-"}</span>
            </div>
          </div>

          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <span className={styles.statLabel}>{labels.requiredTraining}</span>
              <p className={styles.description}>{joinIds(badge.requiredTrainingIds)}</p>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.statLabel}>{labels.requiredAssessment}</span>
              <p className={styles.description}>{joinIds(badge.requiredAssessmentIds ?? [])}</p>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.statLabel}>{labels.certifiedAt}</span>
              <p className={styles.description}>{employeeBadge.certifiedAt ?? "-"}</p>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.statLabel}>{labels.expiresAt}</span>
              <p className={styles.description}>{employeeBadge.expiresAt ?? "-"}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
