import { ServiceUnavailableException } from '@nestjs/common';
import type { ExamBankConfigService } from '../config/exam-bank-config.service';
import { VoyageClient, VoyageRequestError } from './voyage.client';
import { callArg } from '../spec-helpers.testspec';

function jsonResponse(status: number, body: unknown, headers = {}): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

function embeddingsFor(count: number, offset = 0) {
  return {
    data: Array.from({ length: count }, (_, i) => ({
      index: count - 1 - i,
      embedding: [count - 1 - i + offset + 1, 0],
    })),
  };
}

function client(cfg: ExamBankConfigService): VoyageClient {
  const instance = new VoyageClient(cfg);
  instance.sleep = sleep;
  return instance;
}

const sleep = jest.fn().mockResolvedValue(undefined);

describe('VoyageClient', () => {
  const config = {
    voyageApiKey: 'voyage-test',
    embedModel: 'voyage-4',
    voyageBaseUrl: 'https://api.voyageai.com/v1',
  } as ExamBankConfigService;
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    sleep.mockClear();
    fetchMock = jest.spyOn(global, 'fetch');
  });
  afterEach(() => fetchMock.mockRestore());

  it('posts the expected body and returns vectors in input order', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, embeddingsFor(2)));
    const vectors = await client(config).embed(['a', 'b']);

    const url = callArg<string>(fetchMock);
    const init = callArg<{ headers: Record<string, string>; body: string }>(
      fetchMock,
      0,
      1,
    );
    expect(url).toBe('https://api.voyageai.com/v1/embeddings');
    expect(init.headers.Authorization).toBe('Bearer voyage-test');
    expect(JSON.parse(init.body)).toEqual({
      input: ['a', 'b'],
      model: 'voyage-4',
      input_type: 'document',
      output_dimension: 1024,
    });
    expect(vectors).toHaveLength(2);
    expect(vectors[0][0]).toBeCloseTo(1, 6);
  });

  it('sends requests to the configured base URL (MongoDB Atlas keys)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, embeddingsFor(1)));
    const atlas = {
      ...config,
      voyageBaseUrl: 'https://ai.mongodb.com/v1',
    } as ExamBankConfigService;
    await client(atlas).embed(['a']);
    expect(callArg<string>(fetchMock)).toBe(
      'https://ai.mongodb.com/v1/embeddings',
    );
  });

  it('splits inputs into groups of 128', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, embeddingsFor(128)))
      .mockResolvedValueOnce(jsonResponse(200, embeddingsFor(2)));
    const inputs = Array.from({ length: 130 }, (_, i) => `t${i}`);
    const vectors = await client(config).embed(inputs);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(vectors).toHaveLength(130);
  });

  it('retries 429 honouring Retry-After', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(429, {}, { 'retry-after': '2' }))
      .mockResolvedValueOnce(jsonResponse(200, embeddingsFor(1)));
    await client(config).embed(['a']);
    expect(sleep).toHaveBeenCalledWith(2000);
  });

  it('fails fast on 4xx errors other than 429', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, {}));
    await expect(client(config).embed(['a'])).rejects.toEqual(
      new VoyageRequestError(401, 'VOYAGE_HTTP_401'),
    );
    expect(sleep).not.toHaveBeenCalled();
  });

  it('rejects when the key is missing', async () => {
    const noKey = {
      ...config,
      voyageApiKey: undefined,
    } as ExamBankConfigService;
    await expect(client(noKey).embed(['a'])).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
