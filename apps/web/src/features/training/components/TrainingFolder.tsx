import type { ReactNode } from "react";

import type { TrainingFolderGroup } from "@/features/training/utils/trainingFolders";

import styles from "./training-folders.module.css";

interface TrainingFolderProps {
  folder: TrainingFolderGroup;
  name: string;
  countLabel: string;
  requiredLabel: string;
  isExpanded: boolean;
  onToggle: (folderId: string) => void;
  children: ReactNode;
}

function FolderIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className={styles.folderIcon}
      viewBox="0 0 24 24"
      width="26"
      height="26"
      aria-hidden="true"
    >
      <path
        d={
          isOpen
            ? "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H5.5L3 18z M5.5 10H22l-2.5 8.5a1 1 0 0 1-1 .5H4"
            : "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
        }
        fill="currentColor"
        fillOpacity={isOpen ? 0.12 : 0.9}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function TrainingFolder({
  folder,
  name,
  countLabel,
  requiredLabel,
  isExpanded,
  onToggle,
  children,
}: TrainingFolderProps) {
  const panelId = `training-folder-${folder.positionId}`;

  return (
    <section
      className={`${styles.folder} ${isExpanded ? styles.folderOpen : ""}`}
    >
      <button
        type="button"
        className={styles.folderHead}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        onClick={() => onToggle(folder.positionId)}
      >
        <FolderIcon isOpen={isExpanded} />
        <span className={styles.folderName}>{name}</span>
        <span className={styles.folderCount}>{countLabel}</span>
        {folder.requiredCount > 0 ? (
          <span className={styles.folderProgress}>
            <span className={styles.folderProgressBar}>
              <i style={{ width: `${folder.pct}%` }} />
            </span>
            <span className={styles.folderRequired}>{requiredLabel}</span>
          </span>
        ) : null}
        <span
          className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ""}`}
          aria-hidden="true"
        >
          ›
        </span>
      </button>
      {isExpanded ? (
        <div id={panelId} className={styles.folderPanel}>
          {children}
        </div>
      ) : null}
    </section>
  );
}
