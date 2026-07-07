import type {
  BadgeRarity,
  BadgeStatus,
  DisplaySize,
  TrainingBadgeIconType,
  TrainingTrack,
} from "@/types/trainingBadge";
import styles from "@/components/training-badges/training-badges.module.css";

export interface TrainingBadgeSvgProps {
  track: TrainingTrack;
  rarity: BadgeRarity;
  iconType: TrainingBadgeIconType;
  status?: BadgeStatus;
  size?: DisplaySize;
  progress?: number;
  stableId?: string;
}

type BadgeTheme = {
  primary: string;
  accent: string;
  soft: string;
  deep: string;
  paper: string;
};

const TRACK_THEMES: Record<TrainingTrack, BadgeTheme> = {
  general: { primary: "#D71920", accent: "#8E151A", soft: "#F7E7E7", deep: "#6F1014", paper: "#FFFCFA" },
  front: { primary: "#D71920", accent: "#B7892D", soft: "#F8EED8", deep: "#8E151A", paper: "#FFFDF8" },
  kitchen: { primary: "#C75D1B", accent: "#A91118", soft: "#F7ECE1", deep: "#7A3512", paper: "#FFFDF9" },
  management: { primary: "#A91118", accent: "#2F3A45", soft: "#E9EEF1", deep: "#681016", paper: "#FBFCFC" },
  safety: { primary: "#2F6FAE", accent: "#6E7D8B", soft: "#E8F0F7", deep: "#183D63", paper: "#FCFEFF" },
  hygiene: { primary: "#208E5B", accent: "#80BA99", soft: "#E7F4ED", deep: "#12643D", paper: "#FCFFFD" },
  service: { primary: "#D71920", accent: "#B7892D", soft: "#F8EED8", deep: "#8E151A", paper: "#FFFDF8" },
  certification: { primary: "#B7892D", accent: "#A91118", soft: "#F8EFD2", deep: "#6C4510", paper: "#FFFDF7" },
};

const STATUS_TONE: Partial<Record<BadgeStatus, string>> = {
  failed: "#D84A2B",
  expired: "#8A8A8A",
  locked: "#9A9A9A",
};

function clampProgress(progress: number | undefined): number {
  if (typeof progress !== "number" || Number.isNaN(progress)) return 0;
  return Math.min(100, Math.max(0, progress));
}

function IconPath({
  iconType,
  primary,
  accent,
}: {
  iconType: TrainingBadgeIconType;
  primary: string;
  accent: string;
}) {
  const strokeProps = {
    fill: "none",
    stroke: primary,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 6,
  };

  if (iconType === "service" || iconType === "bell") {
    return <path {...strokeProps} d="M48 94 H112 M58 94 C62 70 98 70 102 94 M80 67 V58 M69 58 H91" />;
  }
  if (iconType === "kitchen") {
    return <path {...strokeProps} d="M52 106 L106 52 M104 46 L116 58 L106 68 L94 56 M48 112 L58 122" />;
  }
  if (iconType === "management" || iconType === "target") {
    return <path {...strokeProps} d="M80 40 A40 40 0 1 0 80 120 A40 40 0 1 0 80 40 M80 58 A22 22 0 1 0 80 102 A22 22 0 1 0 80 58 M80 76 V84 M76 80 H84" />;
  }
  if (iconType === "training" || iconType === "book") {
    return <path {...strokeProps} d="M48 48 H75 C83 48 88 54 88 62 V116 C88 108 82 104 74 104 H48Z M88 62 C88 54 94 48 102 48 H112 V104 H102 C94 104 88 108 88 116" />;
  }
  if (iconType === "exam" || iconType === "certificate") {
    return <path {...strokeProps} d="M54 42 H106 V118 H54Z M66 62 H94 M66 78 H94 M66 94 H82 M96 101 L105 110 L122 88" />;
  }
  if (iconType === "shield" || iconType === "safety") {
    return <path {...strokeProps} d="M80 38 L118 54 V78 C118 102 103 117 80 126 C57 117 42 102 42 78 V54Z M62 80 L76 94 L101 66" />;
  }
  if (iconType === "check") {
    return <path {...strokeProps} d="M48 82 L70 104 L114 58" />;
  }
  if (iconType === "star") {
    return <path fill={accent} opacity="0.18" stroke={primary} strokeLinejoin="round" strokeWidth="5" d="M80 38 L91 66 L121 68 L98 87 L106 116 L80 100 L54 116 L62 87 L39 68 L69 66Z" />;
  }
  if (iconType === "crown") {
    return <path {...strokeProps} d="M48 66 L65 92 L80 54 L96 92 L113 66 L106 112 H54Z M56 122 H104" />;
  }
  if (iconType === "laurel") {
    return <path {...strokeProps} d="M58 118 C44 94 48 64 70 46 M102 118 C116 94 112 64 90 46 M60 98 C72 94 76 84 70 73 M100 98 C88 94 84 84 90 73" />;
  }
  if (iconType === "flame") {
    return <path fill={accent} opacity="0.18" stroke={primary} strokeLinejoin="round" strokeWidth="5" d="M78 124 C54 108 60 82 78 64 C78 82 100 86 92 48 C120 72 118 108 88 124 C84 127 82 127 78 124Z" />;
  }
  if (iconType === "bowl" || iconType === "steam") {
    return <path {...strokeProps} d="M44 82 H116 C111 108 96 122 80 122 C64 122 49 108 44 82Z M60 60 C56 50 66 45 62 35 M80 60 C76 50 86 45 82 35 M100 60 C96 50 106 45 102 35" />;
  }
  if (iconType === "chart") {
    return <path {...strokeProps} d="M48 116 V92 M72 116 V74 M96 116 V58 M42 116 H116" />;
  }
  if (iconType === "team") {
    return <path {...strokeProps} d="M80 70 A16 16 0 1 0 80 38 A16 16 0 1 0 80 70 M52 116 C56 94 70 84 80 84 C90 84 104 94 108 116 M48 76 A12 12 0 1 0 48 52 M112 76 A12 12 0 1 1 112 52" />;
  }
  if (iconType === "clock") {
    return <path {...strokeProps} d="M80 40 A40 40 0 1 0 80 120 A40 40 0 1 0 80 40 M80 62 V84 L98 96" />;
  }
  if (iconType === "hygiene") {
    return <path {...strokeProps} d="M80 38 C58 62 50 80 50 96 C50 114 64 126 80 126 C96 126 110 114 110 96 C110 80 102 62 80 38Z M62 88 L75 101 L99 72" />;
  }

  return <path {...strokeProps} d="M48 82 L70 104 L114 58" />;
}

function CredentialShape({
  rarity,
  status,
  theme,
  primary,
}: {
  rarity: BadgeRarity;
  status: BadgeStatus;
  theme: BadgeTheme;
  primary: string;
}) {
  const faded = status === "locked" || status === "expired";

  return (
    <>
      <path
        d="M80 10 L116 20 L141 47 L151 82 L140 116 L113 141 L78 150 L44 140 L18 114 L9 80 L19 45 L45 20Z"
        fill={theme.paper}
        stroke={primary}
        strokeOpacity={faded ? 0.46 : 0.9}
        strokeWidth={rarity === "common" ? 2 : 3}
      />
      <path
        d="M80 22 L110 31 L131 54 L139 82 L130 110 L108 131 L78 138 L50 130 L29 108 L22 80 L30 52 L52 31Z"
        fill={theme.soft}
        fillOpacity={faded ? 0.34 : 0.72}
        stroke={theme.deep}
        strokeOpacity={faded ? 0.16 : 0.22}
        strokeWidth="1.5"
      />
      <rect
        x="45"
        y="45"
        width="70"
        height="70"
        rx="14"
        fill={theme.paper}
        stroke={primary}
        strokeOpacity={faded ? 0.18 : 0.18}
      />
      <path d="M44 125 H116" stroke={primary} strokeLinecap="round" strokeOpacity={faded ? 0.18 : 0.36} strokeWidth="3" />
      {rarity !== "common" ? (
        <path
          d="M36 37 L49 33 M124 37 L111 33 M36 123 L49 127 M124 123 L111 127"
          stroke={theme.accent}
          strokeLinecap="round"
          strokeOpacity={rarity === "legendary" ? 0.62 : 0.38}
          strokeWidth="3"
        />
      ) : null}
      {rarity === "legendary" ? (
        <g fill="none" stroke={theme.accent} strokeLinecap="round" strokeWidth="2.5" opacity={faded ? 0.2 : 0.62}>
          <path d="M47 117 C34 99 33 63 51 43" />
          <path d="M113 117 C126 99 127 63 109 43" />
          <path d="M49 96 C58 94 62 88 60 80 M52 76 C61 73 64 66 61 58" />
          <path d="M111 96 C102 94 98 88 100 80 M108 76 C99 73 96 66 99 58" />
        </g>
      ) : null}
    </>
  );
}

function StatusMark({
  status,
  primary,
}: {
  status: BadgeStatus;
  primary: string;
}) {
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
        <circle cx="119" cy="42" r="15" fill={primary} />
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

export function TrainingBadgeSvg({
  track,
  rarity,
  iconType,
  status = "locked",
  size = "md",
  progress = 0,
  stableId = "training-badge",
}: TrainingBadgeSvgProps) {
  const theme = TRACK_THEMES[track];
  const primary = STATUS_TONE[status] ?? theme.primary;
  const progressValue = clampProgress(status === "locked" ? 0 : progress);
  const dashOffset = 377 - (377 * progressValue) / 100;
  const className = `${styles.badgeSvg} ${styles[`size${size[0].toUpperCase()}${size.slice(1)}`]}`;

  return (
    <svg className={className} viewBox="0 0 160 160" aria-hidden="true" focusable="false">
      <defs>
        <pattern id={`${stableId}-micro-lines`} width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M0 8 L8 0" stroke={theme.deep} strokeOpacity="0.055" strokeWidth="1" />
        </pattern>
      </defs>

      <CredentialShape rarity={rarity} status={status} theme={theme} primary={primary} />
      <path
        d="M80 10 L116 20 L141 47 L151 82 L140 116 L113 141 L78 150 L44 140 L18 114 L9 80 L19 45 L45 20Z"
        fill={`url(#${stableId}-micro-lines)`}
        opacity={status === "locked" || status === "expired" ? 0.32 : 1}
      />

      <circle cx="80" cy="80" r="60" fill="none" stroke="rgba(17,17,17,0.075)" strokeWidth="3" />
      {status === "in_progress" ? (
        <circle cx="80" cy="80" r="60" fill="none" stroke={primary} strokeLinecap="round" strokeWidth="3" strokeDasharray="377" strokeDashoffset={dashOffset} transform="rotate(-90 80 80)" />
      ) : null}

      <IconPath iconType={iconType} primary={primary} accent={theme.accent} />
      <StatusMark status={status} primary={primary} />
    </svg>
  );
}
