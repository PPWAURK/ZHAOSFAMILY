import { claimRow, releaseRow } from './row-lock';

describe('row-lock', () => {
  const now = new Date('2026-11-18T10:00:00Z');

  it('claims a row only when the conditional update hits it', async () => {
    const delegate = { updateMany: jest.fn().mockResolvedValue({ count: 1 }) };
    await expect(claimRow(delegate, 7, now, 1000)).resolves.toBe(true);
    expect(delegate.updateMany).toHaveBeenCalledWith({
      where: {
        id: 7,
        OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
      },
      data: { lockedUntil: new Date(now.getTime() + 1000) },
    });
  });

  it('reports false when another worker holds the lock', async () => {
    const delegate = { updateMany: jest.fn().mockResolvedValue({ count: 0 }) };
    await expect(claimRow(delegate, 7, now)).resolves.toBe(false);
  });

  it('releases the lock', async () => {
    const delegate = { updateMany: jest.fn().mockResolvedValue({ count: 1 }) };
    await releaseRow(delegate, 7);
    expect(delegate.updateMany).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { lockedUntil: null },
    });
  });
});
