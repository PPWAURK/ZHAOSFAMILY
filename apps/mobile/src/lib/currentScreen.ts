import { trackMobileScreen } from "@/lib/firebaseAnalytics";
import { recordMobileModuleOpen } from '@/lib/mobileUsageAnalytics';

let currentScreenName = "";

export function setCurrentScreen(name: string): void {
  const didChange = Boolean(name) && name !== currentScreenName;

  currentScreenName = name;

  if (didChange) {
    trackMobileScreen(name);
    recordMobileModuleOpen(name);
  }
}

export function getCurrentScreen(): string {
  return currentScreenName;
}
