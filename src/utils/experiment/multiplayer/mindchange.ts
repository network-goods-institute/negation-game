export const clampPercentage = (n: number) => {
  if (!Number.isFinite(n)) return 0;
  const r = Math.round(n);
  if (r < 0) return 0;
  if (r > 100) return 100;
  return r;
};

export const initialMindchangeValue = (
  userValue?: number | null,
  _average?: number | null
) => {
  if (typeof userValue === 'number' && Number.isFinite(userValue)) {
    return clampPercentage(userValue);
  }
  return 100;
};

