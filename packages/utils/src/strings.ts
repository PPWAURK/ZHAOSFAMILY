export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hasText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

