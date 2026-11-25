import styles from "../exams.module.css";

export type BadgeTone = "ok" | "warn" | "bad" | "neutral";

const TONE_CLASS: Record<BadgeTone, string> = {
  ok: styles.badgeOk,
  warn: styles.badgeWarn,
  bad: styles.badgeBad,
  neutral: styles.badge,
};

const TONE_BY_STATUS: Record<string, BadgeTone> = {
  READY: "ok",
  APPROVED: "ok",
  COMPLETED: "ok",
  SUBMITTED: "ok",
  FAILED: "bad",
  REJECTED: "bad",
  CANCELED: "bad",
  EXPIRED: "warn",
  DRAFT: "warn",
  PENDING: "warn",
  PROCESSING: "warn",
  PLANNED: "warn",
  SUBMITTING: "warn",
  BATCH_RUNNING: "warn",
  INGESTING: "warn",
  CANCELING: "warn",
  IN_PROGRESS: "warn",
};

type StatusBadgeProps = { status?: string; label: string; tone?: BadgeTone };

export default function StatusBadge({ status, label, tone }: StatusBadgeProps) {
  const resolved = tone ?? TONE_BY_STATUS[status ?? ""] ?? "neutral";
  return <span className={TONE_CLASS[resolved]}>{label}</span>;
}
