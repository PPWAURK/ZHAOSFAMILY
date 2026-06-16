import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Readable } from 'stream';
import OpenAI from 'openai';
import { PDFParse } from 'pdf-parse';
import { MediaService } from '../media/media.service';
import {
  type AiProviderConfig,
  TrainingAiConfigService,
} from './training-ai-config.service';
import {
  QUIZ_LANGUAGES,
  type LocalizedText,
  type TrainingQuizDraftOption,
  type TrainingQuizDraftQuestion,
  type TrainingQuizQuestionType,
} from './training.types';

// Keep prompt + max_tokens under tight free-tier TPM caps (e.g. Groq's 6000):
// the source text dominates prompt size, so cap it conservatively.
const MAX_SOURCE_CHARS = 2000;
// Smaller batches keep each request's output within tight credit / TPM budgets
// (trilingual output is ~3x longer per question).
const GENERATION_BATCH_SIZE = 3;

type MaterialForGeneration = {
  objectKey: string;
  mimeType: string;
  title: string;
  description: string | null;
};

type GenerationBatch = {
  count: number;
  index: number;
  total: number;
};

export type GenerationProgress = {
  /** Number of questions generated so far (expected, may overshoot due to batching). */
  generated: number;
  /** Total questions requested. */
  total: number;
  /** Batches completed so far. */
  batchesDone: number;
  /** Total number of batches. */
  batchesTotal: number;
};

export type OnGenerationProgress = (progress: GenerationProgress) => void;

const SYSTEM_PROMPT = [
  '你是餐饮企业的培训考核出题助手。根据给定的培训资料内容出考核题。',
  '严格只输出一个 JSON 数组，不要任何解释、前后缀或 Markdown 代码块。',
  '',
  '【最重要】每道题的 prompt、每个 option 的 label、explanation 都必须是一个对象，',
  '且必须同时包含 "zh"（简体中文）、"fr"（法语）、"bn"（孟加拉语）三个键，三者意思一致、缺一不可。',
  '绝对禁止把这些字段写成纯字符串，绝对禁止省略 fr 或 bn。即使资料是中文，也必须翻译出法语和孟加拉语。',
  '',
  '完整示例（必须严格照此格式，含真实的法语和孟加拉语）：',
  '[{"type":"single","prompt":{"zh":"处理生熟食材时正确的做法是？","fr":"Quelle est la bonne pratique pour manipuler aliments crus et cuits ?","bn":"কাঁচা ও রান্না করা খাবার পরিচালনার সঠিক উপায় কোনটি?"},"options":[{"key":"a","label":{"zh":"生熟分开，用不同砧板","fr":"Séparer cru et cuit, planches différentes","bn":"কাঁচা ও রান্না আলাদা, ভিন্ন বোর্ড"}},{"key":"b","label":{"zh":"用同一块砧板","fr":"Utiliser la même planche","bn":"একই বোর্ড ব্যবহার করা"}}],"correctKeys":["a"],"explanation":{"zh":"生熟分开可避免交叉污染。","fr":"Séparer cru et cuit évite la contamination croisée.","bn":"কাঁচা ও রান্না আলাদা রাখলে ক্রস-দূষণ এড়ায়।"}}]',
  '',
  '规则：type 为 single/multiple/boolean；single 与 boolean 只能一个正确答案，multiple 两个或以上。',
  '判断题(boolean)固定两个选项：key "true"（zh 正确 / fr Vrai / bn সঠিক）与 key "false"（zh 错误 / fr Faux / bn ভুল）。',
  '其它题型选项 key 用小写字母 a、b、c…。题目要紧扣资料要点，避免无关或过于简单。',
  'JSON 数组长度必须等于用户要求的题目数量。',
].join('\n');

function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

// Maps an AI provider/SDK error to a specific code the UI can explain — most
// importantly "out of credits" vs rate-limited vs bad key vs generic failure.
export function classifyAiError(error: unknown): string {
  const status =
    typeof (error as { status?: unknown })?.status === 'number'
      ? (error as { status: number }).status
      : 0;
  const rawMessage = (error as { message?: unknown })?.message;
  const message = (
    typeof rawMessage === 'string' ? rawMessage : ''
  ).toLowerCase();

  if (
    status === 402 ||
    message.includes('credit') ||
    message.includes('quota') ||
    message.includes('insufficient') ||
    message.includes('billing') ||
    message.includes('afford')
  ) {
    return 'TRAINING_QUIZ_AI_INSUFFICIENT_CREDITS';
  }

  if (
    status === 429 ||
    status === 413 ||
    message.includes('rate limit') ||
    message.includes('tokens per minute') ||
    message.includes('tpm') ||
    message.includes('too large')
  ) {
    return 'TRAINING_QUIZ_AI_RATE_LIMITED';
  }

  if (
    status === 401 ||
    status === 403 ||
    message.includes('authentication') ||
    message.includes('unauthorized') ||
    message.includes('api key')
  ) {
    return 'TRAINING_QUIZ_AI_UNAUTHORIZED';
  }

  return 'TRAINING_QUIZ_AI_REQUEST_FAILED';
}

export function buildGenerationBatches(count: number): GenerationBatch[] {
  const totalCount = Math.max(1, Math.floor(count));
  const total = Math.ceil(totalCount / GENERATION_BATCH_SIZE);
  const batches: GenerationBatch[] = [];

  for (let index = 0; index < total; index += 1) {
    const remaining = totalCount - index * GENERATION_BATCH_SIZE;

    batches.push({
      count: Math.min(GENERATION_BATCH_SIZE, remaining),
      index,
      total,
    });
  }

  return batches;
}

function normalizeType(value: unknown): TrainingQuizQuestionType | null {
  if (value === 'single' || value === 'multiple' || value === 'boolean') {
    return value;
  }

  return null;
}

// Accepts either a localized object {zh,fr,bn} or a bare string (treated as zh).
function normalizeLocalized(value: unknown): LocalizedText {
  if (typeof value === 'string') {
    return value.trim() ? { zh: value.trim() } : {};
  }

  if (!value || typeof value !== 'object') return {};

  const source = value as Record<string, unknown>;
  const localized: LocalizedText = {};

  for (const lang of QUIZ_LANGUAGES) {
    const text = source[lang];
    if (typeof text === 'string' && text.trim()) {
      localized[lang] = text.trim();
    }
  }

  return localized;
}

function hasAnyText(localized: LocalizedText): boolean {
  return QUIZ_LANGUAGES.some((lang) => Boolean(localized[lang]));
}

function normalizeOptions(value: unknown): TrainingQuizDraftOption[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === 'object'),
    )
    .map((item) => ({
      key: String(item.key),
      label: normalizeLocalized(item.label),
    }))
    .filter((option) => option.key && hasAnyText(option.label));
}

// Pull the first JSON array out of the model output, tolerating code fences
// or stray prose around it.
export function parseDrafts(content: string): TrainingQuizDraftQuestion[] {
  const start = content.indexOf('[');
  const end = content.lastIndexOf(']');

  if (start === -1 || end <= start) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content.slice(start, end + 1));
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  const drafts: TrainingQuizDraftQuestion[] = [];

  for (const raw of parsed) {
    if (!raw || typeof raw !== 'object') continue;

    const item = raw as Record<string, unknown>;
    const type = normalizeType(item.type);
    const options = normalizeOptions(item.options);
    const correctKeys = Array.isArray(item.correctKeys)
      ? item.correctKeys.map((key) => String(key))
      : [];
    const prompt = normalizeLocalized(item.prompt);
    const optionKeys = new Set(options.map((option) => option.key));
    const validKeys = correctKeys.filter((key) => optionKeys.has(key));
    const answerCountOk =
      type === 'multiple' ? validKeys.length >= 1 : validKeys.length === 1;

    if (!type || !hasAnyText(prompt) || options.length < 2 || !answerCountOk) {
      continue;
    }

    const explanation = normalizeLocalized(item.explanation);

    drafts.push({
      type,
      prompt,
      options,
      correctKeys: validKeys,
      explanation: hasAnyText(explanation) ? explanation : null,
    });
  }

  return drafts;
}

@Injectable()
export class TrainingQuizGeneratorService {
  private readonly logger = new Logger(TrainingQuizGeneratorService.name);

  constructor(
    private readonly mediaService: MediaService,
    private readonly aiConfigService: TrainingAiConfigService,
  ) {}

  isConfigured(): Promise<boolean> {
    return this.aiConfigService.isConfigured();
  }

  async generate(
    material: MaterialForGeneration,
    count: number,
    onProgress?: OnGenerationProgress,
  ): Promise<TrainingQuizDraftQuestion[]> {
    const config = await this.aiConfigService.resolveProviderConfig();

    if (!config) {
      throw new ServiceUnavailableException('TRAINING_QUIZ_AI_NOT_CONFIGURED');
    }

    const source = await this.extractSourceText(material);

    if (!source.trim()) {
      throw new ServiceUnavailableException('TRAINING_QUIZ_AI_NO_SOURCE');
    }

    const batches = buildGenerationBatches(count);
    const totalBatches = batches.length;
    this.logger.log(
      `Generating ${count} quiz draft questions in ${totalBatches} batch(es) for "${material.title}".`,
    );

    // Run batches sequentially so we don't burst past per-minute token limits
    // (free tiers like Groq cap TPM); the SDK retries 429s honoring Retry-After.
    const draftsByBatch = new Map<number, TrainingQuizDraftQuestion[]>();
    let batchesDone = 0;

    for (const batch of batches) {
      const content = await this.callModel(config, source, batch);
      const batchDrafts = parseDrafts(content);
      draftsByBatch.set(batch.index, batchDrafts);
      batchesDone += 1;

      const generatedSoFar = Array.from(draftsByBatch.values()).flat().length;
      onProgress?.({
        generated: Math.min(generatedSoFar, count),
        total: count,
        batchesDone,
        batchesTotal: totalBatches,
      });
    }

    // Reassemble in batch order.
    const drafts = Array.from(draftsByBatch.entries())
      .sort(([a], [b]) => a - b)
      .flatMap(([, d]) => d)
      .slice(0, count);

    this.logger.log(
      `Generated ${drafts.length}/${count} usable quiz draft questions for "${material.title}".`,
    );

    return drafts;
  }

  private async extractSourceText(
    material: MaterialForGeneration,
  ): Promise<string> {
    const header = [material.title, material.description]
      .filter(Boolean)
      .join('\n');

    if ((material.mimeType || '').toLowerCase().includes('pdf')) {
      try {
        const file = await this.mediaService.getFile(material.objectKey);
        const buffer = await streamToBuffer(file.stream);
        const parser = new PDFParse({ data: new Uint8Array(buffer) });

        try {
          const result = await parser.getText();

          return `${header}\n\n${result.text}`.slice(0, MAX_SOURCE_CHARS);
        } finally {
          await parser.destroy();
        }
      } catch (error) {
        this.logger.warn(
          `PDF text extraction failed for ${material.objectKey}: ${String(error)}`,
        );
      }
    }

    return header.slice(0, MAX_SOURCE_CHARS);
  }

  private async callModel(
    config: AiProviderConfig,
    source: string,
    batch: GenerationBatch,
  ): Promise<string> {
    this.logger.log(
      `Generating quiz draft batch ${batch.index + 1}/${batch.total} (${batch.count} question(s)).`,
    );

    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      defaultHeaders: config.defaultHeaders,
      // Honor 429 Retry-After (e.g. Groq's ~60s per-minute window) automatically.
      maxRetries: 4,
      timeout: 300000,
    });

    try {
      const request = {
        model: config.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              `请基于以下培训资料生成恰好 ${batch.count} 道考核题。`,
              `这是第 ${batch.index + 1}/${batch.total} 批，请覆盖不同的资料要点，避免重复题干。`,
              `JSON 数组必须包含 ${batch.count} 个元素。`,
              '提醒：每个 prompt / option label / explanation 都必须是含 zh、fr、bn 三个键的对象，三语齐全，不能只写中文。',
              '',
              '资料内容：',
              source,
            ].join('\n'),
          },
        ],
        temperature: 0.4,
        top_p: 0.95,
        max_tokens: config.maxTokens,
        stream: false,
      };

      const completion = await client.chat.completions.create({
        ...request,
        ...(config.shouldDisableDeepSeekThinking
          ? {
              // NVIDIA/DeepSeek extra param to suppress chain-of-thought output.
              chat_template_kwargs: { thinking: false },
            }
          : {}),
        ...(config.shouldEnableReasoning
          ? { reasoning: { enabled: true } }
          : {}),
      } as Parameters<typeof client.chat.completions.create>[0]);

      const content =
        'choices' in completion
          ? completion.choices[0]?.message?.content || ''
          : '';

      this.logger.log(
        `Generated quiz draft batch ${batch.index + 1}/${batch.total}.`,
      );

      return content;
    } catch (error) {
      this.logger.error(`Quiz generation request failed: ${String(error)}`);
      throw new ServiceUnavailableException(classifyAiError(error));
    }
  }
}
