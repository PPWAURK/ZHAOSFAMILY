export const PHRASES = ["欢 迎 归 来", "ZHAO's Family", "Bienvenue", "100% Chinese"];

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const INITIAL_LOGIN_DATA = {
  email: "",
  password: "",
  remember: false,
};

export const INITIAL_REGISTER_DATA = {
  name: "",
  email: "",
  password: "",
};

export const PASSWORD_STRENGTH_TONES = ["", "weak", "medium", "medium", "strong"];

export const VELOCITY_TEXTS = [
  "La Taverne de Zhao ✦ ZHAO'S FAMILY ✦ Bienvenue ✦ 常来长安 ✦ Since 2011 ✦ La Taverne de Zhao ✦ ZHAO'S FAMILY ✦ Bienvenue ✦ 常来长安",
];

export const LIAO_SWING_CONFIG = {
  maxHorizontalRotation: 28,
  horizontalDegreesPerPixel: 1 / 10,
  releaseRotationCap: 10,
  releaseVelocityFactor: 110,
  reboundDelayMs: 240,
  returnDelayMs: 180,
};
