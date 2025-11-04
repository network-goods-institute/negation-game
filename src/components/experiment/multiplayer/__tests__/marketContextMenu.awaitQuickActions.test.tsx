import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MarketContextMenu } from '@/components/experiment/multiplayer/common/MarketContextMenu';

let resolveBuy: (() => void) | null = null;
let resolveSell: (() => void) | null = null;

jest.mock('@/utils/market/marketContextMenu', () => ({
  buyShares: jest.fn(() => new Promise<void>((res) => { resolveBuy = res; })),
  sellShares: jest.fn(() => new Promise<void>((res) => { resolveSell = res; })),
  buyAmount: jest.fn(async () => {}),
  sellAmount: jest.fn(async () => {}),
  closePosition: jest.fn(async () => {}),
}));

describe('MarketContextMenu quick actions await network', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED = 'true';
    resolveBuy = null;
    resolveSell = null;
  });

  it('awaits +1 before clearing busy/closing', async () => {
    const onClose = jest.fn();
    render(
      <MarketContextMenu open x={0} y={0} onClose={onClose} kind="node" entityId="p-a" />
    );

    const inc = screen.getByText('+1');
    fireEvent.click(inc);
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => { resolveBuy && resolveBuy(); });
    expect(onClose).toHaveBeenCalled();
  });

  it('awaits −1 before clearing busy/closing', async () => {
    const onClose = jest.fn();
    render(
      <MarketContextMenu open x={0} y={0} onClose={onClose} kind="node" entityId="p-a" />
    );

    const dec = screen.getByText('−1');
    fireEvent.click(dec);
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => { resolveSell && resolveSell(); });
    expect(onClose).toHaveBeenCalled();
  });
});

