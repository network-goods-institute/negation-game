import { renderHook, waitFor } from '@testing-library/react';
import { useAuthSetup } from '../useAuthSetup';

// Mock all dependencies
const mockUsePrivy = jest.fn();
const mockGetQueryData = jest.fn();
const mockUseUserColor = jest.fn();
const mockUseAnonymousId = jest.fn();

jest.mock('@privy-io/react-auth', () => ({
  usePrivy: () => mockUsePrivy(),
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    getQueryData: mockGetQueryData,
  }),
}));

jest.mock('../useUserColor', () => ({
  useUserColor: (id: string) => mockUseUserColor(id),
}));

jest.mock('../useAnonymousId', () => ({
  useAnonymousId: (authenticated: boolean) => mockUseAnonymousId(authenticated),
}));

jest.mock('@/queries/users/useUser', () => ({
  userQueryKey: (id: string) => ['user', id],
}));

describe('useAuthSetup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns authenticated user data when ready', () => {
    mockUsePrivy.mockReturnValue({
      authenticated: true,
      ready: true,
      login: jest.fn(),
      user: { id: 'user123' },
    });

    mockGetQueryData.mockReturnValue({ username: 'testuser' });
    mockUseUserColor.mockReturnValue('#FF0000');
    mockUseAnonymousId.mockReturnValue('anon123');

    const { result } = renderHook(() => useAuthSetup());

    expect(result.current.authenticated).toBe(true);
    expect(result.current.privyReady).toBe(true);
    expect(result.current.userId).toBe('user123');
    expect(result.current.username).toBe('testuser');
    expect(result.current.userColor).toBe('#FF0000');
  });

  it('uses anonymous ID when user is not authenticated', () => {
    mockUsePrivy.mockReturnValue({
      authenticated: false,
      ready: true,
      login: jest.fn(),
      user: undefined,
    });

    mockGetQueryData.mockReturnValue(null);
    mockUseUserColor.mockReturnValue('#0000FF');
    mockUseAnonymousId.mockReturnValue('anon456');

    const { result } = renderHook(() => useAuthSetup());

    expect(result.current.authenticated).toBe(false);
    expect(result.current.userId).toBe('anon456');
    expect(result.current.username).toBe('Viewer #n456');
  });

  it('sets privyTimeout after 5 seconds if not ready', async () => {
    mockUsePrivy.mockReturnValue({
      authenticated: false,
      ready: false,
      login: jest.fn(),
      user: undefined,
    });

    mockGetQueryData.mockReturnValue(null);
    mockUseUserColor.mockReturnValue('#0000FF');
    mockUseAnonymousId.mockReturnValue('anon789');

    const { result } = renderHook(() => useAuthSetup());

    expect(result.current.privyReady).toBe(false);

    jest.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(result.current.privyReady).toBe(true);
    });
  });

  it('displays "Anonymous" username for authenticated users without cached data', () => {
    mockUsePrivy.mockReturnValue({
      authenticated: true,
      ready: true,
      login: jest.fn(),
      user: { id: 'user999' },
    });

    mockGetQueryData.mockReturnValue(null);
    mockUseUserColor.mockReturnValue('#00FF00');
    mockUseAnonymousId.mockReturnValue('anon999');

    const { result } = renderHook(() => useAuthSetup());

    expect(result.current.username).toBe('Anonymous');
  });

  it('generates viewer username with last 4 digits of anonymous ID', () => {
    mockUsePrivy.mockReturnValue({
      authenticated: false,
      ready: true,
      login: jest.fn(),
      user: undefined,
    });

    mockGetQueryData.mockReturnValue(null);
    mockUseUserColor.mockReturnValue('#00FF00');
    mockUseAnonymousId.mockReturnValue('anon-abc-1234');

    const { result } = renderHook(() => useAuthSetup());

    expect(result.current.username).toBe('Viewer #1234');
  });

  it('clears timeout when component unmounts', () => {
    mockUsePrivy.mockReturnValue({
      authenticated: false,
      ready: false,
      login: jest.fn(),
      user: undefined,
    });

    mockGetQueryData.mockReturnValue(null);
    mockUseUserColor.mockReturnValue('#0000FF');
    mockUseAnonymousId.mockReturnValue('anon111');

    const { unmount } = renderHook(() => useAuthSetup());

    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('handles empty anonymous ID gracefully', () => {
    mockUsePrivy.mockReturnValue({
      authenticated: false,
      ready: true,
      login: jest.fn(),
      user: undefined,
    });

    mockGetQueryData.mockReturnValue(null);
    mockUseUserColor.mockReturnValue('#00FF00');
    mockUseAnonymousId.mockReturnValue('');

    const { result } = renderHook(() => useAuthSetup());

    expect(result.current.username).toBe('Viewer #0000');
  });
});
