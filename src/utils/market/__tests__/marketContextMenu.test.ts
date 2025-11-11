import { buyShares, buyAmount, createMarketContextMenuItems } from '../marketContextMenu';

// Mock fetch globally
global.fetch = jest.fn();

describe('marketContextMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { pathname: '/experiment/rationale/multiplayer/test-doc-id' },
      writable: true,
    });

    // Mock window.dispatchEvent
    window.dispatchEvent = jest.fn();
  });

  describe('buyShares', () => {
    it('should call buy-shares API with correct parameters', async () => {
      await buyShares('node-123', 5);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/market/test-doc-id/buy-shares',
        expect.objectContaining({
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            securityId: 'node-123',
            deltaScaled: '5000000000000000000',
          }),
        })
      );
    });

    it('should default to 1 share', async () => {
      await buyShares('node-123');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/market/test-doc-id/buy-shares',
        expect.objectContaining({
          body: JSON.stringify({
            securityId: 'node-123',
            deltaScaled: '1000000000000000000',
          }),
        })
      );
    });

    it('should dispatch market:refresh event after successful purchase', async () => {
      await buyShares('node-123', 2);

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'market:refresh' })
      );
    });

    it('should dispatch tradeComplete after successful purchase', async () => {
      await buyShares('node-123', 1);
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'market:tradeComplete' })
      );
    });

    it('should handle fetch errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(buyShares('node-123', 1)).resolves.not.toThrow();
    });

    it('should handle non-ok responses gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(buyShares('node-123', 1)).resolves.not.toThrow();
    });
  });

  describe('buyAmount', () => {
    it('should call buy-amount API with correct parameters', async () => {
      await buyAmount('edge-456', 10.5);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/market/test-doc-id/buy-amount',
        expect.objectContaining({
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            securityId: 'edge-456',
            spendScaled: '10500000000000000000',
          }),
        })
      );
    });

    it('should handle decimal amounts', async () => {
      await buyAmount('node-123', 2.75);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0][1];
      const body = JSON.parse(callArgs.body);

      expect(body.spendScaled).toBe('2750000000000000000');
    });

    it('should dispatch market:refresh event after successful purchase', async () => {
      await buyAmount('node-123', 5);

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'market:refresh' })
      );
    });

    it('should dispatch tradeComplete after successful amount purchase', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ shares: '1000000000000000000' }) });
      await buyAmount('node-123', 1);
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'market:tradeComplete' })
      );
    });

    it('should handle fetch errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(buyAmount('node-123', 10)).resolves.not.toThrow();
    });
  });

  describe('createMarketContextMenuItems', () => {
    const originalEnv = process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED;

    afterEach(() => {
      process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED = originalEnv;
    });

    it('should return menu items when feature is enabled', () => {
      process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED = 'true';

      const items = createMarketContextMenuItems('node-123');

      expect(items).toHaveLength(5);
      expect(items[0].label).toBe('Buy node +1 share');
      expect(items[1].label).toBe('Buy node amount…');
      expect(items[2].label).toBe('Sell node −1 share');
      expect(items[3].label).toBe('Sell node amount…');
      expect(items[4].label).toBe('Close node position');
    });

    it('should return empty array when feature is disabled', () => {
      process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED = 'false';

      const items = createMarketContextMenuItems('node-123');

      expect(items).toEqual([]);
    });

    it('should call buyShares when first item is clicked', async () => {
      process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED = 'true';

      const items = createMarketContextMenuItems('node-123');
      await items[0].onClick();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/market/test-doc-id/buy-shares',
        expect.objectContaining({
          body: JSON.stringify({
            securityId: 'node-123',
            deltaScaled: '1000000000000000000',
          }),
        })
      );
    });

    it('should call buyAmount when second item is clicked with valid input', async () => {
      process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED = 'true';

      // Mock prompt
      window.prompt = jest.fn().mockReturnValue('5.5');

      const items = createMarketContextMenuItems('edge-789');
      await items[1].onClick();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/market/test-doc-id/buy-amount',
        expect.objectContaining({
          body: JSON.stringify({
            securityId: 'edge-789',
            spendScaled: '5500000000000000000',
          }),
        })
      );
    });

    it('should not call API when prompt is cancelled', async () => {
      process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED = 'true';

      window.prompt = jest.fn().mockReturnValue(null);

      const items = createMarketContextMenuItems('node-123');
      await items[1].onClick();

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should not call API when prompt returns empty string', async () => {
      process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED = 'true';

      window.prompt = jest.fn().mockReturnValue('');

      const items = createMarketContextMenuItems('node-123');
      await items[1].onClick();

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should not call API when prompt returns non-numeric value', async () => {
      process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED = 'true';

      window.prompt = jest.fn().mockReturnValue('invalid');

      const items = createMarketContextMenuItems('node-123');
      await items[1].onClick();

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should not call API when prompt returns zero', async () => {
      process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED = 'true';

      window.prompt = jest.fn().mockReturnValue('0');

      const items = createMarketContextMenuItems('node-123');
      await items[1].onClick();

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should call sellShares when third item is clicked', async () => {
      process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED = 'true';

      const items = createMarketContextMenuItems('node-123');
      await items[2].onClick();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/market/test-doc-id/buy-shares',
        expect.objectContaining({
          body: JSON.stringify({
            securityId: 'node-123',
            deltaScaled: '-1000000000000000000',
          }),
        })
      );
    });

    it('should call sellAmount when fourth item is clicked with valid input', async () => {
      process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED = 'true';
      window.prompt = jest.fn().mockReturnValue('5');

      const items = createMarketContextMenuItems('node-123');
      await items[3].onClick();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/market/test-doc-id/buy-amount',
        expect.objectContaining({
          body: JSON.stringify({
            securityId: 'node-123',
            spendScaled: '-5000000000000000000',
          }),
        })
      );
    });

    it('should call closePosition when fifth item is clicked', async () => {
      process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED = 'true';

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ userHoldings: { 'node-123': '2000000000000000000' } }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

      const items = createMarketContextMenuItems('node-123');
      await items[4].onClick();

      expect(global.fetch).toHaveBeenLastCalledWith(
        '/api/market/test-doc-id/buy-shares',
        expect.objectContaining({
          body: JSON.stringify({
            securityId: 'node-123',
            deltaScaled: '-2000000000000000000',
          }),
        })
      );
    });

    it('should reflect edge kind in labels when id suggests edge', () => {
      process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED = 'true';
      const items = createMarketContextMenuItems('edge-789');
      expect(items[0].label).toBe('Buy edge +1 share');
      expect(items[2].label).toBe('Sell edge −1 share');
    });
  });
});
