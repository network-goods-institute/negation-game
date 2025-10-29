import { useCallback } from 'react';

export type JsonValue = unknown;

export const useSafeJson = () => {
  const safeJson = useCallback(async (response: unknown): Promise<JsonValue | null> => {
    const res: any = response as any;
    if (!res) return null;

    const hasJson = typeof res.json === 'function';
    const contentType = typeof res.headers?.get === 'function' ? res.headers.get('content-type') : null;
    const expectsJson = typeof contentType === 'string' && contentType.toLowerCase().includes('application/json');

    if (!hasJson && !expectsJson) return null;

    try {
      return hasJson ? await res.json() : null;
    } catch {
      return null;
    }
  }, []);

  return { safeJson };
};

