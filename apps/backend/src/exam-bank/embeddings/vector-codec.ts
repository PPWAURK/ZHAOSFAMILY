/** Scales a vector to unit length so that dot product == cosine similarity. */
export function normalizeVector(values: readonly number[]): Float32Array {
  const norm = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0)) || 1;
  return Float32Array.from(values, (v) => v / norm);
}

export function packVector(vector: Float32Array): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(vector.byteLength);
  bytes.set(
    new Uint8Array(vector.buffer, vector.byteOffset, vector.byteLength),
  );
  return bytes;
}

export function unpackVector(bytes: Uint8Array): Float32Array {
  // Copy into a fresh, 4-byte aligned buffer: Prisma may hand back a slice of
  // a larger pooled Buffer whose offset is not aligned.
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Float32Array(copy.buffer);
}

export function dot(a: Float32Array, b: Float32Array): number {
  const length = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < length; i += 1) sum += a[i] * b[i];
  return sum;
}

export function maxSimilarity(
  vector: Float32Array,
  pool: readonly Float32Array[],
): number {
  let best = -1;
  for (const candidate of pool) {
    const score = dot(vector, candidate);
    if (score > best) best = score;
  }
  return best;
}
