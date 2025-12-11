export const getDashCycleLength = (dashArray?: string) => {
  if (!dashArray) return null;
  const parts = dashArray
    .split(/[\s,]+/)
    .map((p) => Number(p))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (parts.length === 0) return null;
  const total = parts.reduce((a, b) => a + b, 0);
  return total > 0 ? total : null;
};

export const computeDashOffset = (
  consumedLength: number | null | undefined,
  dashArray?: string
) => {
  const cycle = getDashCycleLength(dashArray);
  if (!cycle || consumedLength == null || Number.isNaN(consumedLength)) return undefined;
  const offset = consumedLength % cycle;
  return offset === 0 ? 0 : offset;
};
