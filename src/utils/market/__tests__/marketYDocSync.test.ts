import { syncMarketDataToYDoc, MarketData } from '../marketYDocSync';

describe('marketYDocSync', () => {
  describe('syncMarketDataToYDoc', () => {
    let mockYDoc: any;
    let mockYMetaMap: any;
    let mockOrigin: any;

    beforeEach(() => {
      mockYMetaMap = {
        get: jest.fn((key: string) => {
          const storage: Record<string, any> = {};
          return storage[key] || {};
        }),
        set: jest.fn(),
      };

      mockYDoc = {
        transact: jest.fn((fn: Function, origin: any) => {
          fn();
        }),
      };

      mockOrigin = { type: 'runtime' };
    });

    it('should merge and sync complete market data', () => {
      const marketData: MarketData = {
        prices: { 'node-1': 1.5, 'node-2': 2.5 },
        holdings: { 'node-1': '10000000000000000000' },
        totals: { 'node-1': '100000000000000000000' },
        updatedAt: '2024-01-01T00:00:00Z',
      };

      syncMarketDataToYDoc(mockYDoc, mockYMetaMap, marketData, 'doc-123', mockOrigin);

      expect(mockYDoc.transact).toHaveBeenCalledWith(expect.any(Function), mockOrigin);
      expect(mockYMetaMap.set).toHaveBeenCalledWith('market:prices', marketData.prices);
      expect(mockYMetaMap.set).toHaveBeenCalledWith('market:holdings', marketData.holdings);
      expect(mockYMetaMap.set).toHaveBeenCalledWith('market:totals', marketData.totals);
      expect(mockYMetaMap.set).toHaveBeenCalledWith('market:docId', 'doc-123');
      expect(mockYMetaMap.set).toHaveBeenCalledWith('market:updatedAt', '2024-01-01T00:00:00Z');
    });

    it('should merge with existing data', () => {
      mockYMetaMap.get = jest.fn((key: string) => {
        if (key === 'market:prices') return { 'node-1': 1.0, 'node-3': 3.0 };
        if (key === 'market:holdings') return { 'node-1': '5000000000000000000' };
        if (key === 'market:totals') return { 'node-1': '50000000000000000000' };
        return {};
      });

      const marketData: Partial<MarketData> = {
        prices: { 'node-1': 1.5, 'node-2': 2.5 },
        updatedAt: '2024-01-01T00:00:00Z',
      };

      syncMarketDataToYDoc(mockYDoc, mockYMetaMap, marketData, 'doc-123', mockOrigin);

      const pricesCall = mockYMetaMap.set.mock.calls.find((call: any) => call[0] === 'market:prices');
      expect(pricesCall[1]).toEqual({
        'node-1': 1.5, // Updated value
        'node-2': 2.5, // New value
        'node-3': 3.0, // Existing value preserved
      });
    });

    it('should handle partial market data', () => {
      const marketData: Partial<MarketData> = {
        prices: { 'node-1': 1.5 },
      };

      syncMarketDataToYDoc(mockYDoc, mockYMetaMap, marketData, 'doc-123', mockOrigin);

      expect(mockYMetaMap.set).toHaveBeenCalledWith('market:prices', { 'node-1': 1.5 });
      expect(mockYMetaMap.set).toHaveBeenCalledWith('market:holdings', {});
      expect(mockYMetaMap.set).toHaveBeenCalledWith('market:totals', {});
    });

    it('should set source when provided', () => {
      const marketData: MarketData = {
        prices: {},
        holdings: {},
        totals: {},
        updatedAt: '2024-01-01T00:00:00Z',
      };

      syncMarketDataToYDoc(mockYDoc, mockYMetaMap, marketData, 'doc-123', mockOrigin, 'live');

      expect(mockYMetaMap.set).toHaveBeenCalledWith('market:source', 'live');
    });

    it('should not set source when not provided', () => {
      const marketData: MarketData = {
        prices: {},
        holdings: {},
        totals: {},
        updatedAt: '2024-01-01T00:00:00Z',
      };

      syncMarketDataToYDoc(mockYDoc, mockYMetaMap, marketData, 'doc-123', mockOrigin);

      const sourceCall = mockYMetaMap.set.mock.calls.find((call: any) => call[0] === 'market:source');
      expect(sourceCall).toBeUndefined();
    });

    it('should handle empty market data', () => {
      const marketData: Partial<MarketData> = {};

      syncMarketDataToYDoc(mockYDoc, mockYMetaMap, marketData, 'doc-123', mockOrigin);

      expect(mockYMetaMap.set).toHaveBeenCalledWith('market:prices', {});
      expect(mockYMetaMap.set).toHaveBeenCalledWith('market:holdings', {});
      expect(mockYMetaMap.set).toHaveBeenCalledWith('market:totals', {});
    });

    it('should use current timestamp if updatedAt not provided', () => {
      const beforeCall = new Date().toISOString();

      const marketData: Partial<MarketData> = {
        prices: { 'node-1': 1.0 },
      };

      syncMarketDataToYDoc(mockYDoc, mockYMetaMap, marketData, 'doc-123', mockOrigin);

      const afterCall = new Date().toISOString();
      const updatedAtCall = mockYMetaMap.set.mock.calls.find((call: any) => call[0] === 'market:updatedAt');

      expect(updatedAtCall).toBeDefined();
      expect(updatedAtCall[1]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should handle null or empty docId', () => {
      const marketData: MarketData = {
        prices: {},
        holdings: {},
        totals: {},
        updatedAt: '2024-01-01T00:00:00Z',
      };

      syncMarketDataToYDoc(mockYDoc, mockYMetaMap, marketData, '', mockOrigin);

      const docIdCall = mockYMetaMap.set.mock.calls.find((call: any) => call[0] === 'market:docId');
      expect(docIdCall).toBeDefined();
      // Empty string is converted to null
      expect(docIdCall[1]).toBe(null);
    });

    it('should handle errors gracefully', () => {
      mockYDoc.transact = jest.fn(() => {
        throw new Error('Transaction failed');
      });

      const marketData: MarketData = {
        prices: {},
        holdings: {},
        totals: {},
        updatedAt: '2024-01-01T00:00:00Z',
      };

      expect(() => {
        syncMarketDataToYDoc(mockYDoc, mockYMetaMap, marketData, 'doc-123', mockOrigin);
      }).not.toThrow();
    });

    it('should handle missing yMetaMap.get gracefully', () => {
      mockYMetaMap.get = undefined;

      const marketData: MarketData = {
        prices: { 'node-1': 1.5 },
        holdings: {},
        totals: {},
        updatedAt: '2024-01-01T00:00:00Z',
      };

      expect(() => {
        syncMarketDataToYDoc(mockYDoc, mockYMetaMap, marketData, 'doc-123', mockOrigin);
      }).not.toThrow();
    });

    it('should preserve existing data when merging', () => {
      mockYMetaMap.get = jest.fn((key: string) => {
        if (key === 'market:prices') return { 'existing-node': 0.5 };
        return {};
      });

      const marketData: Partial<MarketData> = {
        prices: { 'new-node': 1.5 },
      };

      syncMarketDataToYDoc(mockYDoc, mockYMetaMap, marketData, 'doc-123', mockOrigin);

      const pricesCall = mockYMetaMap.set.mock.calls.find((call: any) => call[0] === 'market:prices');
      expect(pricesCall[1]).toEqual({
        'existing-node': 0.5,
        'new-node': 1.5,
      });
    });
  });
});
