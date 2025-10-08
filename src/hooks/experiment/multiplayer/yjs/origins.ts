export const ORIGIN = {
  USER: 'user',
  RUNTIME: 'runtime',
  SAVE: 'save-meta',
  RECOVERY: 'sync-recovery',
} as const;

export type OriginKey = keyof typeof ORIGIN;
export type OriginValue = typeof ORIGIN[OriginKey];

