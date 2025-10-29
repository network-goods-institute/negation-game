import React, { useEffect } from 'react';
import { render } from '@testing-library/react';
import { useSafeJson } from '../useSafeJson';

describe('useSafeJson', () => {
  it('returns null when response has no json method and no JSON content-type', async () => {
    let api: ((res: unknown) => Promise<unknown | null>) | null = null;

    const Harness = ({ onReady }: { onReady: (fn: (r: unknown) => Promise<unknown | null>) => void }) => {
      const { safeJson } = useSafeJson();
      useEffect(() => {
        onReady(safeJson);
      }, [safeJson, onReady]);
      return null;
    };

    render(<Harness onReady={(fn) => { api = fn; }} />);

    const result = await (api as any)({ ok: true });
    expect(result).toBeNull();
  });

  it('parses JSON when json method exists', async () => {
    let api: ((res: unknown) => Promise<unknown | null>) | null = null;

    const Harness = ({ onReady }: { onReady: (fn: (r: unknown) => Promise<unknown | null>) => void }) => {
      const { safeJson } = useSafeJson();
      useEffect(() => {
        onReady(safeJson);
      }, [safeJson, onReady]);
      return null;
    };

    render(<Harness onReady={(fn) => { api = fn; }} />);

    const json = jest.fn().mockResolvedValue({ a: 1 });
    const result = await (api as any)({ ok: true, json });
    expect(result).toEqual({ a: 1 });
    expect(json).toHaveBeenCalled();
  });
});
