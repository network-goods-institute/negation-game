import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MindchangeBreakdown, breakdownCache } from '../MindchangeBreakdown';
import { GraphProvider } from '../../GraphContext';

const mockGetMindchangeBreakdown = jest.fn();

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <GraphProvider value={{ getMindchangeBreakdown: mockGetMindchangeBreakdown } as any}>
    {children}
  </GraphProvider>
);

describe('MindchangeBreakdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    breakdownCache.clear();
  });

  it('renders loading state initially', () => {
    mockGetMindchangeBreakdown.mockResolvedValue({ forward: [], backward: [] });
    render(<MindchangeBreakdown dir="forward" edgeId="edge1" />);
    const loadingElements = screen.getAllByText(/Loading/i);
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('fetches and displays breakdown data', async () => {
    const mockData = [
      { userId: 'user1', username: 'Alice', value: 50 },
      { userId: 'user2', username: 'Bob', value: -30 },
    ];
    mockGetMindchangeBreakdown.mockResolvedValue({ forward: mockData, backward: [] });

    render(<MindchangeBreakdown dir="forward" edgeId="edge1" />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('+50%')).toBeInTheDocument();
      expect(screen.getByText('-30%')).toBeInTheDocument();
    });
  });

  it('displays correct contributor count', async () => {
    const mockData = [
      { userId: 'user1', username: 'Alice', value: 50 },
      { userId: 'user2', username: 'Bob', value: 30 },
      { userId: 'user3', username: 'Charlie', value: 20 },
    ];
    mockGetMindchangeBreakdown.mockResolvedValue({ forward: mockData, backward: [] });

    render(<MindchangeBreakdown dir="forward" edgeId="edge1" />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Contributors: 3')).toBeInTheDocument();
    });
  });

  it('uses cached data when available', async () => {
    const mockData = [{ userId: 'user1', username: 'Alice', value: 50 }];
    const key = 'edge1:forward';
    breakdownCache.set(key, { ts: Date.now(), data: mockData });

    render(<MindchangeBreakdown dir="forward" edgeId="edge1" />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    expect(mockGetMindchangeBreakdown).not.toHaveBeenCalled();
  });

  it('inverts values for support edge type', async () => {
    const mockData = [{ userId: 'user1', username: 'Alice', value: 50 }];
    mockGetMindchangeBreakdown.mockResolvedValue({ forward: mockData, backward: [] });

    render(<MindchangeBreakdown dir="forward" edgeId="edge1" edgeType="support" />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('-50%')).toBeInTheDocument();
    });
  });

  it('handles empty data gracefully', async () => {
    mockGetMindchangeBreakdown.mockResolvedValue({ forward: [], backward: [] });

    render(<MindchangeBreakdown dir="forward" edgeId="edge1" />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('No data')).toBeInTheDocument();
    });
  });

  it('fetches backward data when direction is backward', async () => {
    const mockData = [{ userId: 'user1', username: 'Alice', value: 50 }];
    mockGetMindchangeBreakdown.mockResolvedValue({ forward: [], backward: mockData });

    render(<MindchangeBreakdown dir="backward" edgeId="edge1" />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
  });

  it('cleans up on unmount', async () => {
    const mockData = [{ userId: 'user1', username: 'Alice', value: 50 }];
    mockGetMindchangeBreakdown.mockResolvedValue({ forward: mockData, backward: [] });

    const { unmount } = render(<MindchangeBreakdown dir="forward" edgeId="edge1" />, { wrapper });

    unmount();
    // No errors should occur
  });
});
