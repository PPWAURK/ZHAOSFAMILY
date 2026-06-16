import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateAiConfigDto } from './dto/update-ai-config.dto';
import { decryptSecret, encryptSecret, maskSecret } from './ai-config-crypto';
import type { AiQuizConfigView } from './training.types';

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'deepseek/deepseek-v4-pro';
const DEFAULT_MAX_TOKENS = 2500;

export type AiProviderConfig = {
  apiKey: string;
  baseURL: string;
  model: string;
  maxTokens: number;
  defaultHeaders?: Record<string, string>;
  shouldEnableReasoning: boolean;
  shouldDisableDeepSeekThinking: boolean;
};

type ConfigRow = {
  apiKeyEnc: string | null;
  baseUrl: string | null;
  model: string | null;
  maxTokens: number | null;
};

function getEnvValue(names: string[]): string | null {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }

  return null;
}

function buildOpenRouterHeaders(): Record<string, string> | undefined {
  const headers: Record<string, string> = {};
  const referer = getEnvValue(['AI_HTTP_REFERER', 'OPENROUTER_HTTP_REFERER']);
  const title = getEnvValue(['AI_APP_TITLE', 'OPENROUTER_APP_TITLE']);

  if (referer) headers['HTTP-Referer'] = referer;
  if (title) headers['X-OpenRouter-Title'] = title;

  return Object.keys(headers).length > 0 ? headers : undefined;
}

@Injectable()
export class TrainingAiConfigService {
  constructor(private readonly prismaService: PrismaService) {}

  // The single source of truth for the AI provider: DB settings (HQ-configured)
  // override environment variables; env stays as a fallback for existing setups.
  async resolveProviderConfig(): Promise<AiProviderConfig | null> {
    const row = await this.getRow();
    const dbKey = row?.apiKeyEnc ? decryptSecret(row.apiKeyEnc) : null;
    const apiKey =
      dbKey ||
      getEnvValue(['AI_API_KEY', 'OPENROUTER_API_KEY', 'NVIDIA_API_KEY']);

    if (!apiKey) return null;

    const baseURL =
      row?.baseUrl ||
      getEnvValue(['AI_BASE_URL', 'OPENROUTER_BASE_URL', 'NVIDIA_BASE_URL']) ||
      DEFAULT_BASE_URL;
    const model =
      row?.model ||
      getEnvValue([
        'AI_QUIZ_MODEL',
        'OPENROUTER_QUIZ_MODEL',
        'NVIDIA_QUIZ_MODEL',
      ]) ||
      DEFAULT_MODEL;
    const maxTokens =
      row?.maxTokens ||
      Number(getEnvValue(['AI_MAX_TOKENS'])) ||
      DEFAULT_MAX_TOKENS;
    const isOpenRouter = baseURL.includes('openrouter');
    const isNvidia = baseURL.includes('nvidia');

    return {
      apiKey,
      baseURL,
      model,
      maxTokens,
      // `reasoning` is OpenRouter-specific; other providers reject it.
      defaultHeaders: isOpenRouter ? buildOpenRouterHeaders() : undefined,
      shouldEnableReasoning: isOpenRouter,
      shouldDisableDeepSeekThinking: isNvidia,
    };
  }

  async isConfigured(): Promise<boolean> {
    return Boolean(await this.resolveProviderConfig());
  }

  // Masked view for the HQ settings UI — never returns the raw key.
  async getConfigView(): Promise<AiQuizConfigView> {
    const row = await this.getRow();
    const dbKey = row?.apiKeyEnc ? decryptSecret(row.apiKeyEnc) : null;
    const envKey = getEnvValue([
      'AI_API_KEY',
      'OPENROUTER_API_KEY',
      'NVIDIA_API_KEY',
    ]);
    const effectiveKey = dbKey || envKey;

    return {
      hasApiKey: Boolean(effectiveKey),
      apiKeyMasked: effectiveKey ? maskSecret(effectiveKey) : '',
      apiKeySource: dbKey ? 'db' : envKey ? 'env' : 'none',
      baseUrl:
        row?.baseUrl ||
        getEnvValue([
          'AI_BASE_URL',
          'OPENROUTER_BASE_URL',
          'NVIDIA_BASE_URL',
        ]) ||
        DEFAULT_BASE_URL,
      model:
        row?.model ||
        getEnvValue([
          'AI_QUIZ_MODEL',
          'OPENROUTER_QUIZ_MODEL',
          'NVIDIA_QUIZ_MODEL',
        ]) ||
        DEFAULT_MODEL,
      maxTokens:
        row?.maxTokens ||
        Number(getEnvValue(['AI_MAX_TOKENS'])) ||
        DEFAULT_MAX_TOKENS,
    };
  }

  async updateConfig(dto: UpdateAiConfigDto): Promise<AiQuizConfigView> {
    const data: {
      apiKeyEnc?: string | null;
      baseUrl?: string | null;
      model?: string | null;
      maxTokens?: number | null;
    } = {};

    // An explicit empty string clears the stored key; undefined leaves it.
    if (dto.apiKey !== undefined) {
      const key = dto.apiKey.trim();
      // Catch truncated/partial pastes — real keys are long.
      if (key && key.length < 20) {
        throw new BadRequestException('AI_API_KEY_TOO_SHORT');
      }
      data.apiKeyEnc = key ? encryptSecret(key) : null;
    }
    if (dto.baseUrl !== undefined) data.baseUrl = dto.baseUrl || null;
    if (dto.model !== undefined) data.model = dto.model || null;
    if (dto.maxTokens !== undefined) data.maxTokens = dto.maxTokens ?? null;

    await this.prismaService.aiQuizConfig.upsert({
      where: { id: 1 },
      create: { id: 1, ...data },
      update: data,
    });

    return this.getConfigView();
  }

  private async getRow(): Promise<ConfigRow | null> {
    try {
      return await this.prismaService.aiQuizConfig.findUnique({
        where: { id: 1 },
        select: {
          apiKeyEnc: true,
          baseUrl: true,
          model: true,
          maxTokens: true,
        },
      });
    } catch {
      // Table missing (migration not yet applied) or DB unavailable — fall
      // back to environment variables instead of breaking generation.
      return null;
    }
  }
}
