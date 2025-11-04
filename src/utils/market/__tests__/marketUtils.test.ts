import {
  SHARES_SCALE_FACTOR,
  scaleToShares,
  sharesToScaled,
  calculateMarketInfluence,
  normalizeSecurityId,
  isMarketEnabled,
  extractMarketData,
  enrichWithMarketData,
  getDocIdFromURL,
  dispatchMarketRefresh,
  buildMarketViewPayload,
} from '../marketUtils';

describe('marketUtils', () => {
  describe('SHARES_SCALE_FACTOR', () => {
    it('should be 1e18', () => {
      expect(SHARES_SCALE_FACTOR).toBe(1e18);
    });
  });

  describe('scaleToShares', () => {
    it('should convert scaled string to shares number', () => {
      expect(scaleToShares('1000000000000000000')).toBe(1);
      expect(scaleToShares('2500000000000000000')).toBe(2.5);
      expect(scaleToShares('0')).toBe(0);
    });

    it('should handle empty string', () => {
      expect(scaleToShares('')).toBe(0);
    });

    it('should handle large numbers', () => {
      expect(scaleToShares('10000000000000000000')).toBe(10);
    });
  });

  describe('sharesToScaled', () => {
    it('should convert shares number to scaled string', () => {
      expect(sharesToScaled(1)).toBe('1000000000000000000');
      expect(sharesToScaled(2.5)).toBe('2500000000000000000');
      expect(sharesToScaled(0)).toBe('0');
    });

    it('should round to nearest integer when necessary', () => {
      const result = sharesToScaled(1.5);
      expect(result).toBe('1500000000000000000');
    });
  });

  describe('calculateMarketInfluence', () => {
    it('should calculate influence correctly when total > 0', () => {
      expect(calculateMarketInfluence(50, 100)).toBe(0);
      expect(calculateMarketInfluence(75, 100)).toBe(0.5);
      expect(calculateMarketInfluence(25, 100)).toBe(-0.5);
      expect(calculateMarketInfluence(100, 100)).toBe(1);
      expect(calculateMarketInfluence(0, 100)).toBe(-1);
    });

    it('should return 0 when total is 0', () => {
      expect(calculateMarketInfluence(10, 0)).toBe(0);
    });

    it('should return 0 when total is negative', () => {
      expect(calculateMarketInfluence(10, -100)).toBe(0);
    });

    it('should handle edge cases', () => {
      expect(calculateMarketInfluence(0, 0)).toBe(0);
      expect(calculateMarketInfluence(1, 2)).toBe(0);
    });
  });

  describe('normalizeSecurityId', () => {
    it('should remove anchor: prefix', () => {
      expect(normalizeSecurityId('anchor:node-123')).toBe('node-123');
      expect(normalizeSecurityId('anchor:edge-456')).toBe('edge-456');
    });

    it('should return id unchanged if no anchor: prefix', () => {
      expect(normalizeSecurityId('node-123')).toBe('node-123');
      expect(normalizeSecurityId('edge-456')).toBe('edge-456');
    });

    it('should handle empty string', () => {
      expect(normalizeSecurityId('')).toBe('');
    });
  });

  describe('isMarketEnabled', () => {
    const originalEnv = process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED;

    afterEach(() => {
      process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED = originalEnv;
    });

    it('should return true when feature flag is enabled', () => {
      process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED = 'true';
      expect(isMarketEnabled()).toBe(true);
    });

    it('should return false when feature flag is disabled', () => {
      process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED = 'false';
      expect(isMarketEnabled()).toBe(false);
    });

    it('should return false when feature flag is undefined', () => {
      delete process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED;
      expect(isMarketEnabled()).toBe(false);
    });
  });

  describe('extractMarketData', () => {
    it('should extract valid market data', () => {
      const data = {
        market: {
          price: 1.5,
          mine: 10,
          total: 100,
          influence: 0.5,
        },
      };

      const result = extractMarketData(data);

      expect(result.price).toBe(1.5);
      expect(result.mine).toBe(10);
      expect(result.total).toBe(100);
      expect(result.influence).toBe(0.5);
      expect(result.hasPrice).toBe(true);
      expect(result.hasHoldings).toBe(true);
    });

    it('should handle missing data gracefully', () => {
      const result = extractMarketData({});

      expect(Number.isNaN(result.price)).toBe(true);
      expect(Number.isNaN(result.mine)).toBe(true);
      expect(Number.isNaN(result.total)).toBe(true);
      expect(Number.isNaN(result.influence)).toBe(true);
      expect(result.hasPrice).toBe(false);
      expect(result.hasHoldings).toBe(false);
    });

    it('should handle invalid data types', () => {
      const data = {
        market: {
          price: 'invalid',
          mine: null,
          total: undefined,
        },
      };

      const result = extractMarketData(data);

      expect(Number.isNaN(result.price)).toBe(true);
      expect(Number.isNaN(result.mine)).toBe(true);
      expect(Number.isNaN(result.total)).toBe(true);
      expect(result.hasPrice).toBe(false);
      expect(result.hasHoldings).toBe(false);
    });

    it('should detect hasHoldings only when mine > 0', () => {
      const dataWithHoldings = extractMarketData({ market: { mine: 5 } });
      expect(dataWithHoldings.hasHoldings).toBe(true);

      const dataWithoutHoldings = extractMarketData({ market: { mine: 0 } });
      expect(dataWithoutHoldings.hasHoldings).toBe(false);

      const dataWithNegative = extractMarketData({ market: { mine: -1 } });
      expect(dataWithNegative.hasHoldings).toBe(false);
    });

    it('should handle exceptions gracefully', () => {
      const result = extractMarketData(null);
      expect(result.hasPrice).toBe(false);
      expect(result.hasHoldings).toBe(false);
    });
  });

  describe('enrichWithMarketData', () => {
    it('should enrich item with price data', () => {
      const item = { id: 'node-1', data: {} };
      const prices = { 'node-1': 2.5 };

      const result = enrichWithMarketData(item, prices, null, null);

      expect((result.data as any).market.price).toBe(2.5);
    });

    it('should enrich item with holdings and calculate influence', () => {
      const item = { id: 'node-1', data: {} };
      const holdings = { 'node-1': '50000000000000000000' }; // 50 shares
      const totals = { 'node-1': '100000000000000000000' }; // 100 shares

      const result = enrichWithMarketData(item, null, holdings, totals);

      expect((result.data as any).market.total).toBe(100);
      expect((result.data as any).market.mine).toBe(50);
      expect((result.data as any).market.influence).toBe(0); // (2*50-100)/100 = 0
      expect((result.data as any).market.mineNorm).toBe(0.5);
    });

    it('should enrich with both price and holdings', () => {
      const item = { id: 'node-1', data: {} };
      const prices = { 'node-1': 1.5 };
      const holdings = { 'node-1': '25000000000000000000' };
      const totals = { 'node-1': '100000000000000000000' };

      const result = enrichWithMarketData(item, prices, holdings, totals);

      expect((result.data as any).market.price).toBe(1.5);
      expect((result.data as any).market.total).toBe(100);
      expect((result.data as any).market.mine).toBe(25);
      expect((result.data as any).market.influence).toBe(-0.5);
    });

    it('should preserve existing data', () => {
      const item = { id: 'node-1', data: { content: 'test', other: 'value' } };
      const prices = { 'node-1': 1.0 };

      const result = enrichWithMarketData(item, prices, null, null);

      expect((result.data as any).content).toBe('test');
      expect((result.data as any).other).toBe('value');
      expect((result.data as any).market.price).toBe(1.0);
    });

    it('should handle items with no matching data', () => {
      const item = { id: 'node-1', data: {} };
      const prices = { 'node-2': 1.5 };

      const result = enrichWithMarketData(item, prices, null, null);

      expect((result.data as any).market).toBeUndefined();
    });

    it('should skip non-finite prices', () => {
      const item = { id: 'node-1', data: {} };
      const prices = { 'node-1': NaN };

      const result = enrichWithMarketData(item, prices, null, null);

      expect((result.data as any).market).toBeUndefined();
    });
  });

  describe('getDocIdFromURL', () => {
    it('should extract doc ID from pathname', () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/experiment/rationale/multiplayer/doc-123' },
        writable: true,
      });

      expect(getDocIdFromURL()).toBe('doc-123');
    });

    it('should return empty string for root path', () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/' },
        writable: true,
      });

      expect(getDocIdFromURL()).toBe('');
    });

    it('should handle paths without trailing slash', () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/experiment/rationale/multiplayer/abc-xyz' },
        writable: true,
      });

      expect(getDocIdFromURL()).toBe('abc-xyz');
    });
  });

  describe('dispatchMarketRefresh', () => {
    it('should dispatch market:refresh event', () => {
      const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

      dispatchMarketRefresh();

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'market:refresh' })
      );

      dispatchSpy.mockRestore();
    });

    it('should not throw if dispatch fails', () => {
      const dispatchSpy = jest.spyOn(window, 'dispatchEvent').mockImplementation(() => {
        throw new Error('Dispatch failed');
      });

      expect(() => dispatchMarketRefresh()).not.toThrow();

      dispatchSpy.mockRestore();
    });
  });

  describe('buildMarketViewPayload', () => {
    it('should build payload from nodes and edges', () => {
      const nodes = [
        { id: 'node-1', type: 'point' },
        { id: 'node-2', type: 'statement' },
        { id: 'anchor:edge-1', type: 'edge_anchor' },
      ];

      const edges = [
        { id: 'edge-1', source: 'node-1', target: 'node-2' },
        { id: 'edge-2', source: 'anchor:node-1', target: 'anchor:node-2' },
      ];

      const result = buildMarketViewPayload(nodes, edges);

      expect(result.nodes).toEqual(['node-1', 'node-2']);
      expect(result.edges).toEqual([
        { id: 'edge-1', source: 'node-1', target: 'node-2' },
        { id: 'edge-2', source: 'node-1', target: 'node-2' },
      ]);
    });

    it('should filter out edge_anchor nodes', () => {
      const nodes = [
        { id: 'node-1', type: 'point' },
        { id: 'anchor:midpoint', type: 'edge_anchor' },
      ];

      const result = buildMarketViewPayload(nodes, []);

      expect(result.nodes).toEqual(['node-1']);
      expect(result.nodes).not.toContain('anchor:midpoint');
    });

    it('should remove anchor: prefix from edge endpoints', () => {
      const edges = [
        { id: 'edge-1', source: 'anchor:src', target: 'anchor:tgt' },
      ];

      const result = buildMarketViewPayload([], edges);

      expect(result.edges[0].source).toBe('src');
      expect(result.edges[0].target).toBe('tgt');
    });

    it('should handle empty arrays', () => {
      const result = buildMarketViewPayload([], []);

      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
    });

    it('should handle null/undefined inputs', () => {
      const result = buildMarketViewPayload(null as any, undefined as any);

      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
    });
  });
});
