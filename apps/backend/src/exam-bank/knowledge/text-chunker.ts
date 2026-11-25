export type TextChunk = {
  content: string;
  tokenEstimate: number;
};

export type ChunkOptions = {
  targetTokens: number;
  maxTokens: number;
  overlapTokens: number;
  minTailTokens: number;
};

export const DEFAULT_CHUNK_OPTIONS: ChunkOptions = {
  targetTokens: 800,
  maxTokens: 1100,
  overlapTokens: 100,
  minTailTokens: 150,
};

const CJK_PATTERN = /[぀-ヿ㐀-䶿一-鿿豈-﫿]/g;
const LATIN_CHARS_PER_TOKEN = 3.5;
const SENTENCE_BOUNDARY = /(?<=[。！？!?；;.])\s*/u;

/** Rough token count: one token per CJK character, ~3.5 chars per token otherwise. */
export function estimateTokens(text: string): number {
  const cjk = text.match(CJK_PATTERN)?.length ?? 0;
  const other = text.replace(CJK_PATTERN, '').replace(/\s+/g, ' ').length;
  return Math.ceil(cjk + other / LATIN_CHARS_PER_TOKEN);
}

export function detectLanguage(text: string): 'zh' | 'fr' | 'mixed' {
  const letters = text.replace(/[\s\d\p{P}\p{S}]/gu, '');
  if (!letters.length) {
    return 'mixed';
  }
  const ratio = (letters.match(CJK_PATTERN)?.length ?? 0) / letters.length;
  if (ratio > 0.3) return 'zh';
  if (ratio < 0.05) return 'fr';
  return 'mixed';
}

export function normalizeText(raw: string): string {
  return raw
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function hardSplit(text: string, maxTokens: number): string[] {
  const pieces: string[] = [];
  let rest = text;
  while (estimateTokens(rest) > maxTokens) {
    const ratio = maxTokens / estimateTokens(rest);
    const cut = Math.max(1, Math.floor(rest.length * ratio));
    pieces.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest.trim()) pieces.push(rest);
  return pieces;
}

/** Paragraphs, then sentences, then raw slices so that no unit exceeds maxTokens. */
function splitIntoUnits(text: string, maxTokens: number): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .flatMap((paragraph) => {
      if (estimateTokens(paragraph) <= maxTokens) return [paragraph];
      return paragraph
        .split(SENTENCE_BOUNDARY)
        .filter((sentence) => sentence.trim())
        .flatMap((sentence) => hardSplit(sentence, maxTokens));
    });
}

function overlapTail(units: string[], overlapTokens: number): string[] {
  const tail: string[] = [];
  let tokens = 0;
  for (let i = units.length - 1; i >= 0; i -= 1) {
    const unitTokens = estimateTokens(units[i]);
    if (tokens + unitTokens > overlapTokens) break;
    tail.unshift(units[i]);
    tokens += unitTokens;
  }
  return tail;
}

function toChunk(units: string[]): TextChunk {
  const content = units.join('\n\n');
  return { content, tokenEstimate: estimateTokens(content) };
}

export function chunkText(
  text: string,
  options: ChunkOptions = DEFAULT_CHUNK_OPTIONS,
): TextChunk[] {
  const units = splitIntoUnits(normalizeText(text), options.maxTokens);
  const groups: string[][] = [];
  let current: string[] = [];
  let currentTokens = 0;
  let freshTokens = 0;

  for (const unit of units) {
    const unitTokens = estimateTokens(unit);
    if (freshTokens > 0 && currentTokens + unitTokens > options.targetTokens) {
      groups.push(current);
      current = overlapTail(current, options.overlapTokens);
      currentTokens = current.reduce((sum, u) => sum + estimateTokens(u), 0);
      freshTokens = 0;
    }
    current.push(unit);
    currentTokens += unitTokens;
    freshTokens += unitTokens;
  }
  if (freshTokens > 0) groups.push(current);

  const chunks = groups.map(toChunk);
  const last = chunks[chunks.length - 1];
  if (chunks.length > 1 && last.tokenEstimate < options.minTailTokens) {
    const merged = groups[groups.length - 2].concat(
      groups[groups.length - 1].slice(
        overlapTail(groups[groups.length - 2], options.overlapTokens).length,
      ),
    );
    chunks.splice(chunks.length - 2, 2, toChunk(merged));
  }
  return chunks;
}
