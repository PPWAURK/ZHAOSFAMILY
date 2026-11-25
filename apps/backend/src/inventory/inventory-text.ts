// Maps Windows-1252 special characters back to their source byte (legacy mojibake fix).
const CP1252_REVERSE: Record<number, number> = {
  0x20ac: 0x80,
  0x201a: 0x82,
  0x0192: 0x83,
  0x201e: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x02c6: 0x88,
  0x2030: 0x89,
  0x0160: 0x8a,
  0x2039: 0x8b,
  0x0152: 0x8c,
  0x017d: 0x8e,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201c: 0x93,
  0x201d: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x02dc: 0x98,
  0x2122: 0x99,
  0x0161: 0x9a,
  0x203a: 0x9b,
  0x0153: 0x9c,
  0x017e: 0x9e,
  0x0178: 0x9f,
};

export function fixMojibake(value: string): string;
export function fixMojibake(value: string | null): string | null;
export function fixMojibake(value: string | null): string | null {
  if (value === null || value === '') return value;

  if (containsCjk(value)) {
    return value;
  }

  const bytes = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    const mapped = CP1252_REVERSE[code];
    bytes[i] = mapped !== undefined ? mapped : code & 0xff;
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return value;
  }
}

function containsCjk(value: string): boolean {
  return /[\u3400-\u9FFF]/.test(value);
}
