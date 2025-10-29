import { EdgeVisualConfig } from './EdgeConfiguration';

type MindchangeData = {
  forward?: { average?: number; count?: number };
  backward?: { average?: number; count?: number };
} | undefined;

interface Params {
  visual: EdgeVisualConfig;
  mindchange: MindchangeData;
  edgeType?: string;
}

export const computeMindchangeStrokeWidth = ({ visual, mindchange, edgeType }: Params): number => {

  const fAvg = Math.max(0, Math.min(100, Math.round(Number(mindchange?.forward?.average ?? 0))));
  const bAvg = Math.max(0, Math.min(100, Math.round(Number(mindchange?.backward?.average ?? 0))));
  const fCount = Math.max(0, Math.round(Number(mindchange?.forward?.count ?? 0)));
  const bCount = Math.max(0, Math.round(Number(mindchange?.backward?.count ?? 0)));

  const hasAny = fCount > 0 || bCount > 0;
  const wMin = Number(visual.strokeWidth(0));
  const wMax = Number(visual.strokeWidth(100));
  const minWidth = Number.isFinite(wMin) ? wMin : 1;
  const maxWidth = Number.isFinite(wMax) ? wMax : minWidth;
  if (maxWidth <= minWidth) return minWidth;

  if (!hasAny) {
    return (minWidth + maxWidth) / 2;
  }
  const value = Math.max(fAvg, bAvg);


  const v = Math.max(0, Math.min(1, value / 100));
  const k = (() => {
    const raw = (process.env.NEXT_PUBLIC_MC_THICKNESS_K || '').trim();
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return 3;
    return Math.max(0.1, Math.min(50, n));
  })();
  const gamma = (() => {
    const raw = (process.env.NEXT_PUBLIC_MC_THICKNESS_GAMMA || '').trim();
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return 2;
    return Math.max(0.5, Math.min(5, n));
  })();
  const vPrime = Math.pow(v, gamma);
  const scaled = Math.log1p(k * vPrime) / Math.log1p(k);
  return minWidth + (maxWidth - minWidth) * scaled;
};
