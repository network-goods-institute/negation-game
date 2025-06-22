export const ALPHA = 1.5;
export const BETA = 0.3;
export const CLAMP = 0.05;

function clamp(value: number, limit: number = CLAMP): number {
  if (value > limit) return limit;
  if (value < -limit) return -limit;
  return value;
}

export function stance(
  endorse: number,
  restake: number,
  doubt: number,
  sign: 1 | -1,
  totalCred: number,
  alpha: number = ALPHA,
  beta: number = BETA
): number {
  if (!endorse && !restake && !doubt) return 0;
  const numerator = endorse + alpha * restake - beta * doubt;
  return (sign * numerator) / totalCred;
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] ** 2;
    nb += b[i] ** 2;
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

export function delta(a: number[], b: number[]): number | null {
  if (a.every((v) => v === 0) && b.every((v) => v === 0)) return null;
  const aNonZero = a.some((v) => v !== 0);
  const bNonZero = b.some((v) => v !== 0);

  // If only one user has engagement we treat it as "no meaningful comparison"
  // and return null so the UI can display "No Data" instead of 0.5.
  if (aNonZero !== bNonZero) return null;

  const sim = cosine(a, b);
  let d = (1 - sim) / 2;

  // If users are perfectly opposite, always return 1
  if (sim === -1) return 1;

  // Small-cluster penalty: for clusters with fewer than 3 points we scale the delta
  // down (never up). Each missing point reduces λ by 0.1 down to a floor of 0.7.
  if (a.length < 3) {
    const missing = 3 - a.length; // 1 → λ=0.9  | 2 → λ=0.8
    const lambda = Math.max(0.7, 1 - 0.1 * missing);
    d *= lambda;
  }
  // Clamp to [0,1] per spec range
  if (d < 0) d = 0;
  if (d > 1) d = 1;
  return d;
}

export type BucketedStance = {
  bucket: string | number | null;
  value: number;
};

/**
 * Convert raw stance values to clamped z-scores within each bucket.
 */
export function toZScores(stances: BucketedStance[]): number[] {
  const byBucket: Record<string, number[]> = {};
  for (const s of stances) {
    const key = s.bucket ?? "__UNTAGGED__";
    (byBucket[key] ??= []).push(s.value);
  }

  const bucketStats: Record<string, { mean: number; stdev: number }> = {};
  for (const [bucket, vals] of Object.entries(byBucket)) {
    const mean = vals.reduce((acc, v) => acc + v, 0) / vals.length;
    const variance =
      vals.reduce((acc, v) => acc + (v - mean) ** 2, 0) / vals.length;
    bucketStats[bucket] = {
      mean,
      stdev: Math.sqrt(variance) || 1, // avoid div by zero
    };
  }

  return stances.map((s) => {
    const stats = bucketStats[s.bucket ?? "__UNTAGGED__"];
    const z = (s.value - stats.mean) / stats.stdev;
    return clamp(z);
  });
}
