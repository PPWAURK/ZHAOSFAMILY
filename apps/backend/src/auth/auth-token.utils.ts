export function parseBearerToken(
  authorization: string | undefined,
): string | undefined {
  if (!authorization?.startsWith('Bearer ')) {
    return undefined;
  }

  return authorization.slice('Bearer '.length);
}
