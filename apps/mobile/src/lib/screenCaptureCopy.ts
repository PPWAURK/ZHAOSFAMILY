import type { AuthLanguage } from "@/features/auth/authCopy";

type ScreenCaptureWarningCopy = {
  message: string;
  title: string;
};

export const SCREEN_CAPTURE_WARNING_COPY: Record<
  AuthLanguage,
  ScreenCaptureWarningCopy
> = {
  zh: {
    title: "检测到截图行为",
    message:
      "已检测到截图操作，您的账号信息已被记录。学习资料和内部资料不允许截图、录屏或外传，请立即删除该截图。",
  },
  en: {
    title: "Screenshot detected",
    message:
      "A screenshot was detected and your account information has been logged. Screenshots, screen recordings, and sharing of training or internal materials are prohibited. Please delete this screenshot immediately.",
  },
  fr: {
    title: "Capture d’écran détectée",
    message:
      "Une capture d’écran a été détectée et les informations de votre compte ont été enregistrées. Les captures d’écran, les enregistrements et le partage de supports de formation ou de documents internes sont interdits. Veuillez supprimer immédiatement cette capture d’écran.",
  },
};

export function getScreenCaptureWarningCopy(
  language: string | null | undefined,
): ScreenCaptureWarningCopy {
  if (language === "en" || language === "fr" || language === "zh") {
    return SCREEN_CAPTURE_WARNING_COPY[language];
  }

  return SCREEN_CAPTURE_WARNING_COPY.zh;
}
