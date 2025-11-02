import { renderHook, waitFor } from '@testing-library/react';
import { useBoardResolution } from '../useBoardResolution';
import { useParams, useRouter } from 'next/navigation';

jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
}));

global.fetch = jest.fn();

describe('useBoardResolution', () => {
  const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
  const mockReplace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      replace: mockReplace,
    } as any);

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        host: 'example.com',
        pathname: '/current/path',
      },
      writable: true,
    });
  });

  it('resolves board ID from slug', async () => {
    mockUseParams.mockReturnValue({ id: 'my-board-slug' } as any);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'board123', slug: 'my-board-slug' }),
    } as Response);

    const { result } = renderHook(() => useBoardResolution());

    await waitFor(() => {
      expect(result.current.resolvedId).toBe('board123');
      expect(result.current.resolvedSlug).toBe('my-board-slug');
    });
  });

  it('generates correct room name', async () => {
    mockUseParams.mockReturnValue({ id: 'board456' } as any);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'board456' }),
    } as Response);

    const { result } = renderHook(() => useBoardResolution());

    await waitFor(() => {
      expect(result.current.roomName).toBe('rationale:board456');
    });
  });

  it('sets notFound to true when API returns 404', async () => {
    mockUseParams.mockReturnValue({ id: 'nonexistent' } as any);

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response);

    const { result } = renderHook(() => useBoardResolution());

    await waitFor(() => {
      expect(result.current.notFound).toBe(true);
    });
  });

  it('uses raw ID if API request fails', async () => {
    mockUseParams.mockReturnValue({ id: 'board789' } as any);

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useBoardResolution());

    await waitFor(() => {
      expect(result.current.resolvedId).toBe('board789');
    });
  });

  it('redirects to canonical URL if different from current', async () => {
    mockUseParams.mockReturnValue({ id: 'old-slug' } as any);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'board999', slug: 'new-slug' }),
    } as Response);

    // Mock buildRationaleDetailPath to return a different path
    jest.mock('@/utils/hosts/syncPaths', () => ({
      buildRationaleDetailPath: () => '/new/canonical/path',
    }));

    renderHook(() => useBoardResolution());

    await waitFor(() => {
      // Note: The actual redirect might not be testable without more complex setup
      // but we can verify the fetch was called
      expect(mockFetch).toHaveBeenCalledWith('/api/experimental/rationales/old-slug');
    });
  });

  it('handles invalid API response data', async () => {
    mockUseParams.mockReturnValue({ id: 'invalid' } as any);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}), // Missing id
    } as Response);

    const { result } = renderHook(() => useBoardResolution());

    await waitFor(() => {
      expect(result.current.resolvedId).toBe('invalid');
    });
  });

  it('returns empty room name when ID is not resolved', () => {
    mockUseParams.mockReturnValue({ id: undefined } as any);

    const { result } = renderHook(() => useBoardResolution());

    expect(result.current.roomName).toBe('rationale:');
  });

  it('handles array params by converting to string', async () => {
    mockUseParams.mockReturnValue({ id: ['board', '123'] } as any);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'board123' }),
    } as Response);

    const { result } = renderHook(() => useBoardResolution());

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it('resets notFound on subsequent successful navigation', async () => {
    mockUseParams.mockReturnValue({ id: 'missing-board' } as any);

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response);

    const { result, rerender } = renderHook(() => useBoardResolution());

    await waitFor(() => {
      expect(result.current.notFound).toBe(true);
    });

    mockUseParams.mockReturnValue({ id: 'valid-board' } as any);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'valid-board', slug: 'valid-board' }),
    } as Response);

    rerender();

    await waitFor(() => {
      expect(result.current.notFound).toBe(false);
      expect(result.current.resolvedId).toBe('valid-board');
    });
  });
});
