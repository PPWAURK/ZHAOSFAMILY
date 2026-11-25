type MockLike = { mock: { calls: unknown[][] } };

/** Typed access to a jest mock's recorded argument (jest types them as any). */
export function callArg<T>(fn: MockLike, call = 0, index = 0): T {
  return fn.mock.calls[call][index] as T;
}

/** expect.objectContaining without leaking `any` into typed literals. */
export function partial(shape: Record<string, unknown>): unknown {
  return expect.objectContaining(shape) as unknown;
}
