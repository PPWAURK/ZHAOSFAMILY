import { tmpdir } from 'os';
import { join } from 'path';
import { OrdersDocumentService } from './orders-document.service';

describe('OrdersDocumentService', () => {
  const originalPublicApiBaseUrl = process.env.PUBLIC_API_BASE_URL;
  const originalApiPrefix = process.env.API_PREFIX;
  const originalStorageRootPath = process.env.STORAGE_ROOT_PATH;

  afterEach(() => {
    restoreEnv('PUBLIC_API_BASE_URL', originalPublicApiBaseUrl);
    restoreEnv('API_PREFIX', originalApiPrefix);
    restoreEnv('STORAGE_ROOT_PATH', originalStorageRootPath);
  });

  it('uses PUBLIC_API_BASE_URL as the full public API prefix', () => {
    process.env.PUBLIC_API_BASE_URL = 'https://api.zhaoplatforme.com/backend3';
    process.env.API_PREFIX = 'api';
    process.env.STORAGE_ROOT_PATH = join(tmpdir(), 'zhao-order-document-test');

    const service = new OrdersDocumentService();

    expect(
      service.buildOrderUrl(
        { protocol: 'http', get: () => '127.0.0.1:3002' },
        42,
      ),
    ).toBe('https://api.zhaoplatforme.com/backend3/orders/42/commande');
  });

  it('falls back to request host and API_PREFIX when no public base URL is set', () => {
    delete process.env.PUBLIC_API_BASE_URL;
    process.env.API_PREFIX = 'api';
    process.env.STORAGE_ROOT_PATH = join(tmpdir(), 'zhao-order-document-test');

    const service = new OrdersDocumentService();

    expect(
      service.buildOrderUrl(
        { protocol: 'http', get: () => 'localhost:3002' },
        42,
      ),
    ).toBe('http://localhost:3002/api/orders/42/commande');
  });

  it('removes a trailing French package unit from the label', () => {
    const service = new OrdersDocumentService();

    expect(service.makeFrLabel('Riz basmati 5 KG')).toBe('Riz basmati');
  });

  it('keeps long labels bounded while removing a trailing package unit', () => {
    const service = new OrdersDocumentService();
    const label = `${'a'.repeat(10_000)} 5 KG`;

    expect(service.makeFrLabel(label)).toBe('a'.repeat(10_000));
  });
});

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}
