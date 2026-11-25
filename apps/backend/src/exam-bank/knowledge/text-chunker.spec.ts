import {
  chunkText,
  detectLanguage,
  estimateTokens,
  normalizeText,
} from './text-chunker';

const OPTIONS = {
  targetTokens: 50,
  maxTokens: 80,
  overlapTokens: 10,
  minTailTokens: 15,
};

describe('estimateTokens', () => {
  it('counts one token per CJK character', () => {
    expect(estimateTokens('食品安全')).toBe(4);
  });

  it('counts roughly 3.5 latin characters per token', () => {
    expect(estimateTokens('abcdefg')).toBe(2);
  });
});

describe('detectLanguage', () => {
  it('detects chinese, french and mixed text', () => {
    expect(detectLanguage('洗手的正确步骤是什么')).toBe('zh');
    expect(detectLanguage('Il faut se laver les mains avant le service.')).toBe(
      'fr',
    );
    expect(detectLanguage('Hygiène 卫生 et sécurité alimentaire 食品')).toBe(
      'mixed',
    );
  });
});

describe('normalizeText', () => {
  it('strips BOM, CRLF and repeated blank lines', () => {
    expect(normalizeText('\uFEFFa  b\r\n\r\n\r\n\r\nc')).toBe('a b\n\nc');
  });
});

describe('chunkText', () => {
  it('returns an empty list for empty input', () => {
    expect(chunkText('   ', OPTIONS)).toEqual([]);
  });

  it('keeps short text in a single chunk', () => {
    const chunks = chunkText('第一段。\n\n第二段。', OPTIONS);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toBe('第一段。\n\n第二段。');
  });

  it('splits long text into chunks under the hard maximum', () => {
    const paragraphs = Array.from({ length: 12 }, (_, i) =>
      `第${i}段内容说明。`.padEnd(20, '规'),
    );
    const chunks = chunkText(paragraphs.join('\n\n'), OPTIONS);

    expect(chunks.length).toBeGreaterThan(2);
    chunks.forEach((chunk) =>
      expect(chunk.tokenEstimate).toBeLessThanOrEqual(OPTIONS.maxTokens),
    );
  });

  it('repeats the trailing units of a chunk at the start of the next one', () => {
    const paragraphs = Array.from({ length: 30 }, (_, i) => `段${i}说明`);
    const chunks = chunkText(paragraphs.join('\n\n'), OPTIONS);
    const firstUnits = chunks[0].content.split('\n\n');

    expect(chunks.length).toBeGreaterThan(1);
    const secondUnits = chunks[1].content.split('\n\n');
    expect(firstUnits.slice(-2)).toEqual(secondUnits.slice(0, 2));
  });

  it('splits a single oversized paragraph by sentences', () => {
    const paragraph = Array.from({ length: 30 }, () => '这是一个句子。').join(
      '',
    );
    const chunks = chunkText(paragraph, OPTIONS);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk) =>
      expect(chunk.tokenEstimate).toBeLessThanOrEqual(OPTIONS.maxTokens + 20),
    );
  });

  it('merges a tiny trailing chunk into the previous one', () => {
    const big = '甲'.repeat(45);
    const chunks = chunkText(`${big}\n\n${big}\n\n尾。`, OPTIONS);
    expect(chunks[chunks.length - 1].content.endsWith('尾。')).toBe(true);
    expect(chunks[chunks.length - 1].tokenEstimate).toBeGreaterThan(
      OPTIONS.minTailTokens,
    );
  });
});
