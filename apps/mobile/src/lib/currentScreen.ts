let currentScreenName = "";

export function setCurrentScreen(name: string): void {
  currentScreenName = name;
}

export function getCurrentScreen(): string {
  return currentScreenName;
}
