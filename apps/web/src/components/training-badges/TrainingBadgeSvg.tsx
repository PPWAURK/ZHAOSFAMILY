"use client";

import type {
  BadgeRarity,
  BadgeStatus,
  DisplaySize,
  TrainingBadgeIconType,
  TrainingTrack,
} from "@/types/trainingBadge";
import { buildBadgeImageUrl } from "@/shared/api/api-client";
import styles from "@/components/training-badges/training-badges.module.css";

export interface TrainingBadgeSvgProps {
  track: TrainingTrack;
  rarity: BadgeRarity;
  iconType: TrainingBadgeIconType;
  status?: BadgeStatus;
  size?: DisplaySize;
  progress?: number;
  stableId?: string;
  imageFileName?: string;
}

const DEFAULT_BADGE_IMAGE = "badge.svg";
const ICON_SVG_SCALE = 1;

const BADGE_FRAME_PREFIXES = ["badge"];

function isBadgeFrame(fileName: string): boolean {
  const name = fileName.replace(/\.svg$/i, "");
  return BADGE_FRAME_PREFIXES.some((prefix) => name === prefix || name.startsWith(`${prefix}-`));
}

function badgeImageSrc(imageFileName?: string): string {
  return buildBadgeImageUrl(imageFileName ?? DEFAULT_BADGE_IMAGE);
}

function clampProgress(progress: number | undefined): number {
  if (typeof progress !== "number" || Number.isNaN(progress)) return 0;
  return Math.min(100, Math.max(0, progress));
}

function StatusMark({ status }: { status: BadgeStatus }) {
  if (status === "locked") {
    return (
      <g fill="none" stroke="#737373" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4.5">
        <rect x="62" y="75" width="36" height="31" rx="7" />
        <path d="M70 75 V65 C70 52 90 52 90 65 V75" />
      </g>
    );
  }

  if (status === "certified") {
    return (
      <g>
        <circle cx="119" cy="42" r="15" fill="#D71920" />
        <path d="M111 42 L117 48 L127 36" fill="none" stroke="#FFFCFA" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" />
      </g>
    );
  }

  if (status === "failed") {
    return (
      <g>
        <path d="M80 34 L118 111 H42Z" fill="#FFF7F1" stroke="#D84A2B" strokeLinejoin="round" strokeWidth="3.5" />
        <path d="M80 62 V86 M80 102 H80.2" stroke="#D84A2B" strokeLinecap="round" strokeWidth="5.5" />
      </g>
    );
  }

  if (status === "expired") {
    return (
      <path d="M80 47 A33 33 0 1 0 80 113 A33 33 0 1 0 80 47 M80 65 V83 L94 93" fill="none" stroke="#777" strokeLinecap="round" strokeWidth="4.5" />
    );
  }

  return null;
}

export function TrainingBadgeSvg(props: TrainingBadgeSvgProps) {
  const { status = "locked", size = "md", progress = 0, imageFileName } = props;
  const progressValue = clampProgress(status === "locked" ? 0 : progress);
  const dashOffset = 390 - (390 * progressValue) / 100;
  const className = `${styles.badgeSvg} ${styles[`size${size[0].toUpperCase()}${size.slice(1)}`]}`;
  const faded = status === "locked" || status === "expired";
  const src = badgeImageSrc(imageFileName);

  const scaleIcon = imageFileName && !isBadgeFrame(imageFileName);
  const imageTransform = scaleIcon
    ? `translate(80,80) scale(${ICON_SVG_SCALE}) translate(-80,-80)`
    : undefined;

  return (
    <svg className={className} viewBox="0 0 160 160" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={`badge-clip-${imageFileName ?? "default"}`}>
          <rect x="10" y="10" width="140" height="140" rx="8" />
        </clipPath>
      </defs>
      <g clipPath={`url(#badge-clip-${imageFileName ?? "default"})`}>
        <image
          href={src}
          x="10" y="10" width="140" height="140"
          opacity={faded ? 0.35 : 1}
          preserveAspectRatio="xMidYMid meet"
          transform={imageTransform}
        />
      </g>

      {faded && (
        <rect x="10" y="10" width="140" height="140" rx="8" fill="rgba(255,255,255,0.18)" />
      )}

      {status === "in_progress" && progressValue > 0 && (
        <circle
          cx="80" cy="80" r="62"
          fill="none" stroke="#D71920" strokeLinecap="round" strokeWidth="3"
          strokeDasharray="390" strokeDashoffset={dashOffset}
          transform="rotate(-90 80 80)"
        />
      )}

      <StatusMark status={status} />
    </svg>
  );
}
