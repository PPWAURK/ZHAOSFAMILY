export type MobileOnboardingCompletionDestination = "home" | "training";

export type MobileOnboardingTargetBounds = {
  height: number;
  width: number;
  x: number;
  y: number;
};

export type MobileOnboardingTargetId =
  | "congrats"
  | "issues"
  | "more"
  | "news"
  | "orders"
  | "training";

export type MobileOnboardingTargets = Record<
  MobileOnboardingTargetId,
  MobileOnboardingTargetBounds | null
>;

export function shouldShowMobileOnboarding(
  completedAt: string | null | undefined,
): boolean {
  return !completedAt;
}

export function resolveOnboardingCompletionDestination(
  isReplay: boolean,
  destination: MobileOnboardingCompletionDestination,
): MobileOnboardingCompletionDestination | null {
  return isReplay ? null : destination;
}
