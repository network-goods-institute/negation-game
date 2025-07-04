import { renderHook, act } from '@testing-library/react';
import { usePrivy } from '@privy-io/react-auth';
import { useUser } from '@/queries/users/useUser';
import { useDelegateLinksPrompt } from '../useDelegateLinksPrompt';

jest.mock('@privy-io/react-auth', () => ({
  usePrivy: jest.fn(),
}));
jest.mock('@/queries/users/useUser');

const mockUsePrivy = usePrivy as jest.MockedFunction<typeof usePrivy>;
const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;

describe('useDelegateLinksPrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not show prompt when user is not ready', () => {
    mockUsePrivy.mockReturnValue({
      user: null,
      ready: false,
    } as any);
    mockUseUser.mockReturnValue({ data: null } as any);

    const { result } = renderHook(() => useDelegateLinksPrompt());

    expect(result.current.isOpen).toBe(false);
  });

  it('does not show prompt when user is not authenticated', () => {
    mockUsePrivy.mockReturnValue({
      user: null,
      ready: true,
    } as any);
    mockUseUser.mockReturnValue({ data: null } as any);

    const { result } = renderHook(() => useDelegateLinksPrompt());

    expect(result.current.isOpen).toBe(false);
  });

  it('does not show prompt when user has already seen it', () => {
    (localStorage.getItem as jest.Mock).mockReturnValue('true');
    
    mockUsePrivy.mockReturnValue({
      user: { id: 'test-user' },
      ready: true,
    } as any);
    mockUseUser.mockReturnValue({ data: { id: 'test-user' } } as any);

    const { result } = renderHook(() => useDelegateLinksPrompt());

    expect(result.current.isOpen).toBe(false);
  });

  it('does not show prompt when user already has delegate links', () => {
    (localStorage.getItem as jest.Mock).mockReturnValue(null);
    
    mockUsePrivy.mockReturnValue({
      user: { id: 'test-user' },
      ready: true,
    } as any);
    mockUseUser.mockReturnValue({
      data: {
        id: 'test-user',
        agoraLink: 'https://agora.xyz/delegates/test-user',
      }
    } as any);

    const { result } = renderHook(() => useDelegateLinksPrompt());

    expect(result.current.isOpen).toBe(false);
    expect(localStorage.setItem).toHaveBeenCalledWith('hasSeenDelegatePrompt', 'true');
  });

  it('shows prompt after delay when conditions are met', () => {
    (localStorage.getItem as jest.Mock).mockReturnValue(null);
    
    mockUsePrivy.mockReturnValue({
      user: { id: 'test-user' },
      ready: true,
    } as any);
    mockUseUser.mockReturnValue({
      data: {
        id: 'test-user',
        agoraLink: null,
        scrollDelegateLink: null,
        delegationUrl: null,
      }
    } as any);

    const { result } = renderHook(() => useDelegateLinksPrompt());

    expect(result.current.isOpen).toBe(false);

    // Fast-forward timer
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(result.current.isOpen).toBe(true);
  });

  it('does not show prompt when user has scrollDelegateLink', () => {
    (localStorage.getItem as jest.Mock).mockReturnValue(null);
    
    mockUsePrivy.mockReturnValue({
      user: { id: 'test-user' },
      ready: true,
    } as any);
    mockUseUser.mockReturnValue({
      data: {
        id: 'test-user',
        scrollDelegateLink: 'https://gov.scroll.io/delegates/test-user',
      }
    } as any);

    const { result } = renderHook(() => useDelegateLinksPrompt());

    expect(result.current.isOpen).toBe(false);
    expect(localStorage.setItem).toHaveBeenCalledWith('hasSeenDelegatePrompt', 'true');
  });

  it('does not show prompt when user has delegationUrl', () => {
    (localStorage.getItem as jest.Mock).mockReturnValue(null);
    
    mockUsePrivy.mockReturnValue({
      user: { id: 'test-user' },
      ready: true,
    } as any);
    mockUseUser.mockReturnValue({
      data: {
        id: 'test-user',
        delegationUrl: 'https://example.com/delegate',
      }
    } as any);

    const { result } = renderHook(() => useDelegateLinksPrompt());

    expect(result.current.isOpen).toBe(false);
    expect(localStorage.setItem).toHaveBeenCalledWith('hasSeenDelegatePrompt', 'true');
  });
});