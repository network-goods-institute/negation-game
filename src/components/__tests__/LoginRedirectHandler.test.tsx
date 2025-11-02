import { render, waitFor } from '@testing-library/react';
import { LoginRedirectHandler } from '../LoginRedirectHandler';
import { usePrivy } from '@privy-io/react-auth';
import { logger } from '@/lib/logger';

// Mock usePrivy hook
jest.mock('@privy-io/react-auth', () => ({
  usePrivy: jest.fn(),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('LoginRedirectHandler', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // Mock window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        ...originalLocation,
        host: 'negationgame.com',
        href: 'https://negationgame.com',
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
    jest.clearAllMocks();
  });

  it('should redirect when user transitions from logged out to logged in', async () => {
    const mockUsePrivy = usePrivy as jest.Mock;

    // Start with unauthenticated
    mockUsePrivy.mockReturnValue({
      ready: true,
      authenticated: false,
    });

    const { rerender } = render(<LoginRedirectHandler />);

    // Verify no redirect yet
    await waitFor(() => {
      expect(window.location.href).toBe('https://negationgame.com');
    });

    // Simulate login - transition to authenticated
    mockUsePrivy.mockReturnValue({
      ready: true,
      authenticated: true,
    });

    rerender(<LoginRedirectHandler />);

    await waitFor(() => {
      expect(window.location.href).toBe('https://sync.negationgame.com');
    });
  });

  it('should not redirect if user is already authenticated on mount', async () => {
    const initialHref = window.location.href;

    (usePrivy as jest.Mock).mockReturnValue({
      ready: true,
      authenticated: true,
    });

    render(<LoginRedirectHandler />);

    await waitFor(() => {
      // Should NOT redirect because there was no login event
      expect(window.location.href).toBe(initialHref);
    });
  });

  it('should not redirect when transitioning to unauthenticated', async () => {
    const mockUsePrivy = usePrivy as jest.Mock;
    const initialHref = window.location.href;

    // Start authenticated
    mockUsePrivy.mockReturnValue({
      ready: true,
      authenticated: true,
    });

    const { rerender } = render(<LoginRedirectHandler />);

    // Logout - transition to unauthenticated
    mockUsePrivy.mockReturnValue({
      ready: true,
      authenticated: false,
    });

    rerender(<LoginRedirectHandler />);

    await waitFor(() => {
      expect(window.location.href).toBe(initialHref);
    });
  });

  it('should not redirect when on localhost', async () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        ...originalLocation,
        host: 'localhost:3000',
        href: 'http://localhost:3000',
      },
    });

    const mockUsePrivy = usePrivy as jest.Mock;

    mockUsePrivy.mockReturnValue({
      ready: true,
      authenticated: false,
    });

    const { rerender } = render(<LoginRedirectHandler />);

    mockUsePrivy.mockReturnValue({
      ready: true,
      authenticated: true,
    });

    rerender(<LoginRedirectHandler />);

    await waitFor(() => {
      expect(logger.log).toHaveBeenCalledWith('[LoginRedirectHandler] Would redirect to sync in production');
    });
  });

  it('should not redirect when already on sync subdomain', async () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        ...originalLocation,
        host: 'sync.negationgame.com',
        href: 'https://sync.negationgame.com',
      },
    });

    const mockUsePrivy = usePrivy as jest.Mock;
    const initialHref = window.location.href;

    mockUsePrivy.mockReturnValue({
      ready: true,
      authenticated: false,
    });

    const { rerender } = render(<LoginRedirectHandler />);

    mockUsePrivy.mockReturnValue({
      ready: true,
      authenticated: true,
    });

    rerender(<LoginRedirectHandler />);

    await waitFor(() => {
      expect(window.location.href).toBe(initialHref);
    });
  });

  it('should not redirect when Privy is not ready', async () => {
    const mockUsePrivy = usePrivy as jest.Mock;
    const initialHref = window.location.href;

    mockUsePrivy.mockReturnValue({
      ready: false,
      authenticated: false,
    });

    const { rerender } = render(<LoginRedirectHandler />);

    mockUsePrivy.mockReturnValue({
      ready: false,
      authenticated: true,
    });

    rerender(<LoginRedirectHandler />);

    await waitFor(() => {
      expect(window.location.href).toBe(initialHref);
    });
  });

  it('should redirect when on www subdomain', async () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        ...originalLocation,
        host: 'www.negationgame.com',
        href: 'https://www.negationgame.com',
      },
    });

    const mockUsePrivy = usePrivy as jest.Mock;

    mockUsePrivy.mockReturnValue({
      ready: true,
      authenticated: false,
    });

    const { rerender } = render(<LoginRedirectHandler />);

    mockUsePrivy.mockReturnValue({
      ready: true,
      authenticated: true,
    });

    rerender(<LoginRedirectHandler />);

    await waitFor(() => {
      expect(window.location.href).toBe('https://sync.negationgame.com');
    });
  });

  it('should handle multiple authentication state changes correctly', async () => {
    const mockUsePrivy = usePrivy as jest.Mock;
    let redirectCount = 0;

    Object.defineProperty(window.location, 'href', {
      set: (value) => {
        if (value === 'https://sync.negationgame.com') {
          redirectCount++;
        }
      },
      configurable: true,
    });

    // Start unauthenticated
    mockUsePrivy.mockReturnValue({
      ready: true,
      authenticated: false,
    });

    const { rerender } = render(<LoginRedirectHandler />);

    // First login
    mockUsePrivy.mockReturnValue({
      ready: true,
      authenticated: true,
    });
    rerender(<LoginRedirectHandler />);

    await waitFor(() => {
      expect(redirectCount).toBe(1);
    });

    // Logout
    mockUsePrivy.mockReturnValue({
      ready: true,
      authenticated: false,
    });
    rerender(<LoginRedirectHandler />);

    // Second login - should trigger another redirect
    mockUsePrivy.mockReturnValue({
      ready: true,
      authenticated: true,
    });
    rerender(<LoginRedirectHandler />);

    await waitFor(() => {
      expect(redirectCount).toBe(2);
    });
  });
});
