import type {
  TitleCategory,
  TitleFrameSize,
  TitleIconType,
  TitleRarity,
} from "@/types/title";
import styles from "@/features/titles/components/title-components.module.css";

export interface TitleFrameSvgProps {
  category: TitleCategory;
  rarity: TitleRarity;
  iconType: TitleIconType;
  locked?: boolean;
  selected?: boolean;
  size?: TitleFrameSize;
  progress?: number;
  stableId?: string;
}

type TitleTheme = {
  ink: string;
  line: string;
  accent: string;
  wash: string;
};

const TITLE_THEMES: Record<TitleCategory, TitleTheme> = {
  growth: { ink: "#A91118", line: "#D71920", accent: "#2F8F63", wash: "#FFF8F6" },
  front: { ink: "#A91118", line: "#D71920", accent: "#B7892D", wash: "#FFF9EF" },
  kitchen: { ink: "#914316", line: "#C75D1B", accent: "#A91118", wash: "#FFF7EF" },
  management: { ink: "#681016", line: "#A91118", accent: "#2F3A45", wash: "#F9FAFA" },
  fun: { ink: "#64328F", line: "#8F4BD8", accent: "#C75D1B", wash: "#FFF8F4" },
  premium: { ink: "#6C4510", line: "#B7892D", accent: "#A91118", wash: "#FFFDF7" },
};

const SIZE_CLASS: Record<TitleFrameSize, string> = {
  sm: styles.frameSm,
  md: styles.frameMd,
  lg: styles.frameLg,
};

function clampProgress(progress: number | undefined): number {
  if (typeof progress !== "number" || Number.isNaN(progress)) return 0;
  return Math.min(100, Math.max(0, progress));
}

function TitleGlyph({
  iconType,
  theme,
}: {
  iconType: TitleIconType;
  theme: TitleTheme;
}) {
  const stroke = {
    fill: "none",
    stroke: theme.ink,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 3.4,
  };
  const softFill = { fill: theme.accent, fillOpacity: 0.14 };

  if (iconType === "plant" || iconType === "sprout" || iconType === "growth-line") {
    return (
      <g {...stroke}>
        <path d="M24 40 V24" />
        <path d="M23 25 C13 24 8 17 10 9 C20 10 25 16 23 25Z" {...softFill} />
        <path d="M25 25 C35 24 40 17 38 9 C28 10 23 16 25 25Z" {...softFill} />
        <path d="M23 25 C13 24 8 17 10 9 C20 10 25 16 23 25Z" />
        <path d="M25 25 C35 24 40 17 38 9 C28 10 23 16 25 25Z" />
        <path d="M14 41 H34" />
      </g>
    );
  }
  if (iconType === "chef") {
    return (
      <g {...stroke}>
        <path d="M13 40 V27 C8 24 6 19 8 14 C10 9 16 8 21 11 C24 5 34 5 37 12 C42 11 46 15 45 21 C44 25 41 28 36 29 V40Z" {...softFill} />
        <path d="M13 40 V27 C8 24 6 19 8 14 C10 9 16 8 21 11 C24 5 34 5 37 12 C42 11 46 15 45 21 C44 25 41 28 36 29 V40Z" />
        <path d="M13 34 H36" />
        <path d="M24 26 V32" />
      </g>
    );
  }
  if (iconType === "cooking" || iconType === "flame" || iconType === "bowl" || iconType === "spatula") {
    return (
      <g {...stroke}>
        <path d="M12 24 H38 L35 39 H15Z" {...softFill} />
        <path d="M12 24 H38 L35 39 H15Z" />
        <path d="M9 24 H41" />
        <path d="M17 15 C14 11 18 8 16 5" />
        <path d="M26 15 C23 11 28 8 25 5" />
        <path d="M35 15 C32 11 37 8 34 5" />
      </g>
    );
  }
  if (iconType === "flash" || iconType === "lightning" || iconType === "swap") {
    return <path d="M26 5 L10 27 H23 L18 43 L39 18 H26Z" fill={theme.accent} fillOpacity="0.15" stroke={theme.ink} strokeLinejoin="round" strokeWidth="3.4" />;
  }
  if (iconType === "girl" || iconType === "door") {
    return (
      <g {...stroke}>
        <path d="M14 40 C16 32 20 29 24 29 C28 29 32 32 34 40" {...softFill} />
        <path d="M14 40 C16 32 20 29 24 29 C28 29 32 32 34 40" />
        <path d="M14 21 C14 12 20 8 24 8 C30 8 35 13 34 22 C30 19 28 15 28 11 C25 18 20 21 14 21Z" />
        <path d="M18 21 C18 27 30 27 30 21" />
      </g>
    );
  }
  if (iconType === "prestige" || iconType === "crown" || iconType === "laurel" || iconType === "flag" || iconType === "mountain" || iconType === "compass") {
    return (
      <g {...stroke}>
        <path d="M10 19 C10 17 12 16 14 18 L19 24 L23 12 C24 10 26 10 27 12 L32 24 L37 18 C39 16 42 17 41 20 L37 35 C36 37 35 38 33 38 H15 C13 38 12 37 11 35Z" {...softFill} />
        <path d="M10 19 C10 17 12 16 14 18 L19 24 L23 12 C24 10 26 10 27 12 L32 24 L37 18 C39 16 42 17 41 20 L37 35 C36 37 35 38 33 38 H15 C13 38 12 37 11 35Z" />
        <path d="M15 32 H37" />
        <path d="M17 42 H31" />
        <circle cx="24.8" cy="25" r="1.8" fill={theme.ink} stroke="none" />
      </g>
    );
  }
  if (iconType === "trusted" || iconType === "shield") {
    return (
      <g {...stroke}>
        <path d="M24 6 L38 13 V24 C38 33 32 39 24 42 C16 39 10 33 10 24 V13Z" {...softFill} />
        <path d="M24 6 L38 13 V24 C38 33 32 39 24 42 C16 39 10 33 10 24 V13Z" />
        <path d="M17 24 L22 29 L32 18" />
      </g>
    );
  }
  if (iconType === "smile" || iconType === "service-bell") {
    return (
      <g {...stroke}>
        <circle cx="24" cy="24" r="17" {...softFill} />
        <circle cx="24" cy="24" r="17" />
        <path d="M17 21 H17.3 M31 21 H31.3" />
        <path d="M16 29 C20 34 28 34 32 29" />
      </g>
    );
  }
  if (iconType === "star") {
    return <path d="M24 7 L29 19 L42 20 L32 28 L35 41 L24 34 L13 41 L16 28 L6 20 L19 19Z" fill={theme.accent} fillOpacity="0.14" stroke={theme.ink} strokeLinejoin="round" strokeWidth="3.4" />;
  }
  return <path d="M24 7 L40 22 L24 42 L8 22Z M8 22 H40 M16 13 L24 42 L32 13" fill={theme.accent} fillOpacity="0.14" stroke={theme.ink} strokeLinejoin="round" strokeWidth="3.4" />;
}

export function TitleFrameSvg({
  category,
  rarity,
  iconType,
  locked = false,
  selected = false,
  size = "md",
  progress,
  stableId = "title-frame",
}: TitleFrameSvgProps) {
  const theme = locked
    ? { ink: "#777", line: "#9A9A9A", accent: "#C7C1BB", wash: "#FAF8F5" }
    : TITLE_THEMES[category];
  const progressWidth = (304 * clampProgress(progress)) / 100;
  const patternId = `${stableId}-${category}-${rarity}-weave`;
  const className = `${styles.frameSvg} ${SIZE_CLASS[size]}`;
  const rarityTone = rarity === "legendary" ? theme.accent : theme.line;

  return (
    <svg className={className} viewBox="0 0 360 190" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <pattern id={patternId} width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M0 10 L10 0" stroke={theme.ink} strokeOpacity="0.035" strokeWidth="1" />
        </pattern>
      </defs>

      <path d="M24 22 H336 C342 22 346 26 346 32 V158 C346 164 342 168 336 168 H24 C18 168 14 164 14 158 V32 C14 26 18 22 24 22Z" fill="#FFFDF8" stroke={selected ? "#D71920" : rarityTone} strokeOpacity={locked ? 0.34 : selected ? 0.9 : 0.62} strokeWidth={selected ? 2.4 : rarity === "common" ? 1.2 : 1.7} />
      <path d="M30 30 H330 C334 30 338 34 338 38 V152 C338 156 334 160 330 160 H30 C26 160 22 156 22 152 V38 C22 34 26 30 30 30Z" fill={theme.wash} stroke={theme.ink} strokeOpacity="0.08" />
      <rect x="22" y="30" width="316" height="130" fill={`url(#${patternId})`} opacity={locked ? 0.35 : 1} />

      <path d="M36 52 H168" stroke={theme.ink} strokeOpacity="0.055" />
      <path d="M36 138 H176" stroke={theme.ink} strokeOpacity="0.055" />

      <g opacity={locked ? 0.22 : 1}>
        <path d="M255 30 H330 C334 30 338 34 338 38 V152 C338 156 334 160 330 160 H255Z" fill={rarityTone} fillOpacity={rarity === "legendary" ? 0.11 : 0.055} />
        <path d="M255 30 V160" stroke={theme.ink} strokeOpacity="0.08" />
        <path d="M275 55 H319" stroke={rarityTone} strokeLinecap="round" strokeOpacity="0.36" strokeWidth="1.8" />
        <path d="M289 76 H319" stroke={rarityTone} strokeLinecap="round" strokeOpacity="0.24" strokeWidth="1.8" />
        <path d="M275 135 H319" stroke={rarityTone} strokeLinecap="round" strokeOpacity="0.26" strokeWidth="1.8" />
      </g>

      <g opacity={locked ? 0.3 : 1}>
        <rect x="270" y="58" width="58" height="58" rx="16" fill="#FFFDF8" fillOpacity="0.88" stroke={rarityTone} strokeOpacity={rarity === "common" ? 0.24 : 0.46} strokeWidth="1.4" />
        <circle cx="299" cy="87" r="22" fill={theme.accent} fillOpacity={rarity === "legendary" ? 0.16 : 0.1} />
        <svg x="275" y="63" width="48" height="48" viewBox="0 0 48 48" overflow="visible">
          <TitleGlyph iconType={iconType} theme={theme} />
        </svg>
      </g>

      {rarity === "epic" || rarity === "legendary" ? (
        <path d="M42 42 H82 M42 148 H82 M278 42 H318 M278 148 H318" stroke={theme.accent} strokeLinecap="round" strokeOpacity={rarity === "legendary" ? 0.5 : 0.28} strokeWidth="1.5" />
      ) : null}
      {rarity === "legendary" ? (
        <g fill="none" stroke={theme.accent} strokeLinecap="round" strokeWidth="1.7" opacity={locked ? 0.22 : 0.46}>
          <path d="M124 44 C142 36 218 36 236 44" />
          <path d="M124 146 C142 154 218 154 236 146" />
        </g>
      ) : null}
      {typeof progress === "number" ? (
        <g>
          <rect x="28" y="174" width="304" height="4" fill="rgba(23,18,15,0.08)" />
          <rect x="28" y="174" width={progressWidth} height="4" fill={theme.line} opacity={locked ? 0.42 : 0.8} />
        </g>
      ) : null}
      {locked ? (
        <g fill="none" stroke="#737373" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3">
          <rect x="166" y="82" width="28" height="25" rx="6" />
          <path d="M173 82 V74 C173 64 187 64 187 74 V82" />
        </g>
      ) : null}
      {selected && !locked ? (
        <g>
          <rect x="309" y="28" width="28" height="28" rx="7" fill="#D71920" />
          <path d="M316 42 L322 48 L333 36" fill="none" stroke="#FFFDF8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        </g>
      ) : null}
    </svg>
  );
}
