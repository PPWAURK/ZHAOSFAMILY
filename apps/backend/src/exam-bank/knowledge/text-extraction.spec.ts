import { Readable } from 'stream';
import {
  NoExtractableTextError,
  extractText,
  streamToBuffer,
} from './text-extraction';

const getText = jest.fn();
const destroy = jest.fn();
jest.mock('pdf-parse', () => ({
  PDFParse: jest.fn().mockImplementation(() => ({ getText, destroy })),
}));
const extractRawText = jest.fn();
jest.mock('mammoth', () => ({
  __esModule: true,
  default: {
    extractRawText: (input: unknown): unknown => extractRawText(input),
  },
}));

const LONG_ZH = '员工上岗前必须洗手并佩戴帽子。'.repeat(20);

describe('extractText', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reads plain text and strips the BOM', async () => {
    const result = await extractText(Buffer.from(`\uFEFF${LONG_ZH}`), 'txt');
    expect(result.text.startsWith('员工')).toBe(true);
    expect(result.pageCount).toBeNull();
  });

  it('extracts docx text through mammoth', async () => {
    extractRawText.mockResolvedValue({ value: LONG_ZH, messages: [] });
    const result = await extractText(Buffer.from('docx'), 'docx');
    expect(result.text).toBe(LONG_ZH);
    expect(extractRawText).toHaveBeenCalledWith({
      buffer: Buffer.from('docx'),
    });
  });

  it('extracts pdf text and always destroys the parser', async () => {
    getText.mockResolvedValue({ text: LONG_ZH, total: 1 });
    const result = await extractText(Buffer.from('pdf'), 'pdf');
    expect(result).toEqual({ text: LONG_ZH, pageCount: 1 });
    expect(destroy).toHaveBeenCalled();
  });

  it('rejects scanned PDFs with almost no text per page', async () => {
    getText.mockResolvedValue({ text: LONG_ZH, total: 40 });
    await expect(extractText(Buffer.from('pdf'), 'pdf')).rejects.toBeInstanceOf(
      NoExtractableTextError,
    );
  });

  it('rejects documents that are too short', async () => {
    await expect(
      extractText(Buffer.from('trop court'), 'txt'),
    ).rejects.toBeInstanceOf(NoExtractableTextError);
  });
});

describe('streamToBuffer', () => {
  it('concatenates stream chunks', async () => {
    const buffer = await streamToBuffer(
      Readable.from(['ab', Buffer.from('cd')]),
    );
    expect(buffer.toString()).toBe('abcd');
  });
});
