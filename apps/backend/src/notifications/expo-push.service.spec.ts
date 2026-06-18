import { ConfigService } from '@nestjs/config';
import { ExpoPushService } from './expo-push.service';
import type { ExpoPushMessage } from './notifications.types';

describe('ExpoPushService', () => {
  const configService = {
    get: jest.fn().mockReturnValue(undefined),
  } as unknown as ConfigService;

  let service: ExpoPushService;
  let fetchMock: jest.Mock;

  const message = (to: string): ExpoPushMessage => ({
    to,
    title: 'Hello',
    body: 'World',
  });

  const okResponse = (tickets: unknown[]) => ({
    ok: true,
    json: () => Promise.resolve({ data: tickets }),
  });

  beforeEach(() => {
    service = new ExpoPushService(configService);
    fetchMock = jest.fn();
    global.fetch = fetchMock as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns no invalid tokens when every ticket is ok', async () => {
    fetchMock.mockResolvedValue(
      okResponse([{ status: 'ok' }, { status: 'ok' }]),
    );

    const result = await service.send([message('a'), message('b')]);

    expect(result.invalidTokens).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('collects tokens flagged DeviceNotRegistered', async () => {
    fetchMock.mockResolvedValue(
      okResponse([
        { status: 'ok' },
        {
          status: 'error',
          message: 'gone',
          details: { error: 'DeviceNotRegistered' },
        },
      ]),
    );

    const result = await service.send([message('a'), message('b')]);

    expect(result.invalidTokens).toEqual(['b']);
  });

  it('ignores non-DeviceNotRegistered errors', async () => {
    fetchMock.mockResolvedValue(
      okResponse([
        {
          status: 'error',
          message: 'rate limited',
          details: { error: 'MessageRateExceeded' },
        },
      ]),
    );

    const result = await service.send([message('a')]);

    expect(result.invalidTokens).toEqual([]);
  });

  it('chunks requests to at most 100 messages each', async () => {
    fetchMock.mockResolvedValue(
      okResponse(Array.from({ length: 100 }, () => ({ status: 'ok' }))),
    );

    const messages = Array.from({ length: 150 }, (_, i) => message(`t${i}`));
    await service.send(messages);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns no invalid tokens when the request fails', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    const result = await service.send([message('a')]);

    expect(result.invalidTokens).toEqual([]);
  });
});
