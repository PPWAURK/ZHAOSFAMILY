import {
  getScreenCaptureWarningCopy,
  SCREEN_CAPTURE_WARNING_COPY,
} from "@/lib/screenCaptureCopy";

describe("getScreenCaptureWarningCopy", () => {
  it.each(["zh", "en", "fr"] as const)(
    "returns the %s screenshot warning copy",
    (language) => {
      expect(getScreenCaptureWarningCopy(language)).toBe(
        SCREEN_CAPTURE_WARNING_COPY[language],
      );
    },
  );

  it("falls back to Chinese for an unsupported language", () => {
    expect(getScreenCaptureWarningCopy("de")).toBe(
      SCREEN_CAPTURE_WARNING_COPY.zh,
    );
  });
});
