export function getRequiredEnvValue(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getOptionalEnvValue(value: string | undefined, fallback: string): string {
  return value && value.trim().length > 0 ? value : fallback;
}

