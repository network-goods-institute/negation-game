export type MindchangePayload = {
  forward?: { average?: number; count?: number };
  backward?: { average?: number; count?: number };
};

export const computeMindchangeStrokeWidth = (
  minWidth: number,
  maxWidth: number,
  mindchange: MindchangePayload | undefined
): number => {
  const f = Number(mindchange?.forward?.average ?? 0) || 0;
  const b = Number(mindchange?.backward?.average ?? 0) || 0;
  const intensity = Math.max(Math.abs(f), Math.abs(b));
  if (intensity <= 0) return minWidth;
  if (intensity >= 100) return maxWidth;
  const norm = Math.log1p(intensity) / Math.log1p(100);
  const width = minWidth + (maxWidth - minWidth) * norm;
  try {
    const debug = typeof process !== 'undefined' && ["true", "1", "yes", "on"].includes(String(process.env.NEXT_PUBLIC_MINDCHANGE_DEBUG || '').toLowerCase());
    if (debug) {
      // eslint-disable-next-line no-console
      console.info('[mindchange] width', { intensity, f, b, width });
    }
  } catch {}
  return width;
};
