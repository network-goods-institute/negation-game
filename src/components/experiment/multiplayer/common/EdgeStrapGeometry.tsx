import { useMemo } from 'react';

export interface StrapGeometryResult {
  path: string;
  widthAt: (u: number) => number;
  posAt: (u: number) => { x: number; y: number };
  L: number;
  sx: number;
  sy: number;
  ex: number;
  ey: number;
}

export interface StrapGeometryConfig {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  strength: number; // 0..1 based on mindchange
  neckPx?: number;
  minCorePx?: number;
  segments?: number;
  areaMultiplier?: number;
}

export const useStrapGeometry = (config: StrapGeometryConfig | null): StrapGeometryResult | null => {
  const {
    sourceX,
    sourceY,
    targetX,
    targetY,
    strength,
    neckPx = 24,
    minCorePx = 2.0,
    segments = 64,
    areaMultiplier = 800
  } = config || { sourceX: 0, sourceY: 0, targetX: 0, targetY: 0, strength: 0 };

  return useMemo(() => {
    if (!Number.isFinite(sourceX) || !Number.isFinite(sourceY) || !Number.isFinite(targetX) || !Number.isFinite(targetY)) {
      return null;
    }

    const sx = sourceX as number, sy = sourceY as number;
    const ex = targetX as number, ey = targetY as number;
    const dx = ex - sx, dy = ey - sy;
    const L = Math.hypot(dx, dy);

    if (!L || L < 4) return null;

    const nx = -dy / L, ny = dx / L;
    const N = segments;
    const NECK_PX = neckPx;
    const MIN_CORE_PX = minCorePx;

    // Base target area; scale by strength (0..1)
    const areaPx = areaMultiplier * Math.max(0, Math.min(1, strength));
    const smoothStep = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

    const g: number[] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const r1 = smoothStep((L * t) / NECK_PX);
      const r2 = smoothStep((L * (1 - t)) / NECK_PX);
      const base = Math.min(1, r1) * Math.min(1, r2);
      // shallow mid attenuation for shape, not physics
      const bell = Math.exp(-Math.pow((t - 0.5) / 0.6, 2));
      g.push(Math.max(0, base * (0.85 + 0.15 * bell)));
    }

    let gInt = 0;
    const dt = 1 / N;
    for (let i = 1; i <= N; i++) gInt += 0.5 * (g[i - 1] + g[i]) * dt;

    const scale = Math.max(0, areaPx / (L * Math.max(1e-6, gInt)));

    // End bulbs for visual attachment
    const edgeSigma = 0.08;
    let bumpMax = 0;
    const bump: number[] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const b = Math.exp(-Math.pow(t / edgeSigma, 2)) + Math.exp(-Math.pow((1 - t) / edgeSigma, 2));
      bump[i] = b;
      if (b > bumpMax) bumpMax = b;
    }
    for (let i = 0; i <= N; i++) bump[i] = bump[i] / (bumpMax || 1);

    const coreMask: number[] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const r1 = smoothStep((L * t) / NECK_PX);
      const r2 = smoothStep((L * (1 - t)) / NECK_PX);
      coreMask.push(Math.min(1, r1) * Math.min(1, r2));
    }

    const midIndex = Math.floor(N / 2);
    const predMid = scale * g[midIndex];
    const bulbGain = Math.max(0, MIN_CORE_PX - predMid) * 1.25;

    const topPts: string[] = [];
    const botPts: string[] = [];
    const widths: number[] = [];

    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const cx = sx + dx * t;
      const cy = sy + dy * t;
      let w = Math.max(0, scale * g[i]);
      // slight width modulation by strength
      w *= (0.8 + 0.2 * Math.max(0, Math.min(1, strength)));
      w = Math.max(w, MIN_CORE_PX * coreMask[i]);
      w += bulbGain * bump[i];
      widths.push(w);
      const ox = (w / 2) * nx, oy = (w / 2) * ny;
      topPts.push(`${cx + ox},${cy + oy}`);
      botPts.push(`${cx - ox},${cy - oy}`);
    }

    const path = `M ${topPts.join(' L ')} L ${botPts.reverse().join(' L ')} Z`;

    const widthAt = (u: number) => {
      const t = Math.max(0, Math.min(1, u));
      const idx = t * N;
      const i0 = Math.floor(idx);
      const i1 = Math.min(N, i0 + 1);
      const frac = idx - i0;
      return widths[i0] * (1 - frac) + widths[i1] * frac;
    };

    const posAt = (u: number) => {
      const t = Math.max(0, Math.min(1, u));
      return { x: sx + dx * t, y: sy + dy * t };
    };

    return { path, widthAt, posAt, L, sx, sy, ex, ey };
  }, [sourceX, sourceY, targetX, targetY, strength, neckPx, minCorePx, segments, areaMultiplier]);
};