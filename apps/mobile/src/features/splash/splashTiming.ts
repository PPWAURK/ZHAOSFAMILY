export const SPLASH_STAGE = {
  width: 390,
  height: 844,
};

export const SPLASH_DURATION_MS = 3_950;

export const SPLASH_TIMELINE = {
  focusEnd: 400,
  noodleInEnd: 1_800,
  noodleOutEnd: 3_000,
  logoStart: 2_850,
  logoFull: 3_800,
  holdEnd: 3_900,
  exitEnd: SPLASH_DURATION_MS,
};

export const SPLASH_COLORS = {
  paper: "#6F0D10",
  paperWarm: "#EFE0C9",
  noodle: "#D99025",
  noodleDeep: "#8F4312",
  noodleLight: "#FFE1A2",
  chili: "#6C210D",
  red: "#9D1B1E",
  redDeep: "#6F0D10",
  ink: "#2E2923",
  bowl: "#D9B483",
  bowlShadow: "#8B6848",
  steam: "rgba(157, 27, 30, 0.38)",
};

export const SPLASH_EASING = {
  outQuint: [0.22, 1, 0.36, 1] as const,
  outQuart: [0.25, 1, 0.5, 1] as const,
  inOutCubic: [0.65, 0, 0.35, 1] as const,
};
