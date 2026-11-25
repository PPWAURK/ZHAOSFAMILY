import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import type { Readable } from 'stream';
import { normalizeText } from './text-chunker';

export type SourceKind = 'pdf' | 'docx' | 'txt';

export type ExtractedText = {
  text: string;
  pageCount: number | null;
};

export const MAX_EXTRACTED_CHARS = 2_000_000;
const MIN_MEANINGFUL_CHARS = 200;
/**
 * A transcription is real content even when short: reference tables are
 * mostly numbers and units, which do not count as meaningful characters.
 */
export const MIN_TRANSCRIBED_CHARS = 30;
const MIN_CHARS_PER_PDF_PAGE = 100;

export class NoExtractableTextError extends Error {
  constructor() {
    super('KB_MATERIAL_NO_TEXT');
    this.name = 'NoExtractableTextError';
  }
}

export function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer | string) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
    );
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

async function extractPdf(buffer: Buffer): Promise<ExtractedText> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return { text: result.text, pageCount: result.total };
  } finally {
    await parser.destroy();
  }
}

async function extractDocx(buffer: Buffer): Promise<ExtractedText> {
  const result = await mammoth.extractRawText({ buffer });
  return { text: result.value, pageCount: null };
}

function countMeaningfulChars(text: string): number {
  return text.replace(/[\s\d\p{P}\p{S}]/gu, '').length;
}

/**
 * Throws NoExtractableTextError when the document is (almost) empty, which in
 * practice means a scanned PDF: the admin must run OCR before uploading.
 */
export function assertHasText(
  extracted: ExtractedText,
  minChars: number = MIN_MEANINGFUL_CHARS,
): void {
  const meaningful = countMeaningfulChars(extracted.text);
  const perPage = extracted.pageCount
    ? meaningful / extracted.pageCount
    : Number.POSITIVE_INFINITY;
  if (meaningful < minChars || perPage < MIN_CHARS_PER_PDF_PAGE) {
    throw new NoExtractableTextError();
  }
}

export async function extractText(
  buffer: Buffer,
  kind: SourceKind,
): Promise<ExtractedText> {
  const raw =
    kind === 'pdf'
      ? await extractPdf(buffer)
      : kind === 'docx'
        ? await extractDocx(buffer)
        : { text: buffer.toString('utf8'), pageCount: null };
  const extracted = {
    text: normalizeText(raw.text).slice(0, MAX_EXTRACTED_CHARS),
    pageCount: raw.pageCount,
  };
  assertHasText(extracted);
  return extracted;
}
