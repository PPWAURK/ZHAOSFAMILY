import {
  resolveOnboardingCompletionDestination,
  shouldShowMobileOnboarding,
} from "@/features/onboarding/mobileOnboardingState";

describe("mobile onboarding state", () => {
  it("shows only when the account has not completed onboarding", () => {
    expect(shouldShowMobileOnboarding(null)).toBe(true);
    expect(shouldShowMobileOnboarding(undefined)).toBe(true);
    expect(shouldShowMobileOnboarding("2026-07-27T12:00:00.000Z")).toBe(false);
  });

  it("does not persist or redirect when a completed guide is replayed", () => {
    expect(resolveOnboardingCompletionDestination(false, "home")).toBe("home");
    expect(resolveOnboardingCompletionDestination(false, "training")).toBe("training");
    expect(resolveOnboardingCompletionDestination(true, "home")).toBeNull();
    expect(resolveOnboardingCompletionDestination(true, "training")).toBeNull();
  });
});
