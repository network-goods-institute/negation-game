import { render, waitFor } from '@testing-library/react';
import { RedirectLoggedInUsers } from '../RedirectLoggedInUsers';
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

describe('RedirectLoggedInUsers', () => {
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

  it('should redirect authenticated users on negationgame.com to sync', async () => {
    (usePrivy as jest.Mock).mockReturnValue({
      ready: true,
      authenticated: true,
    });

    render(<RedirectLoggedInUsers />);

    await waitFor(() => {
      expect(window.location.href).toBe('https://sync.negationgame.com');
    });
  });

  it('should not redirect unauthenticated users', async () => {
    const initialHref = window.location.href;

    (usePrivy as jest.Mock).mockReturnValue({
      ready: true,
      authenticated: false,
    });

    render(<RedirectLoggedInUsers />);

    await waitFor(() => {
      expect(window.location.href).toBe(initialHref);
    });
  });

  it('should not redirect when Privy is not ready', async () => {
    const initialHref = window.location.href;

    (usePrivy as jest.Mock).mockReturnValue({
      ready: false,
      authenticated: true,
    });

    render(<RedirectLoggedInUsers />);

    await waitFor(() => {
      expect(window.location.href).toBe(initialHref);
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

    const initialHref = window.location.href;

    (usePrivy as jest.Mock).mockReturnValue({
      ready: true,
      authenticated: true,
    });

    render(<RedirectLoggedInUsers />);

    await waitFor(() => {
      expect(window.location.href).toBe(initialHref);
    });
  });

  it('should not redirect on localhost', async () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        ...originalLocation,
        host: 'localhost:3000',
        href: 'http://localhost:3000',
      },
    });

    (usePrivy as jest.Mock).mockReturnValue({
      ready: true,
      authenticated: true,
    });

    render(<RedirectLoggedInUsers />);

    await waitFor(() => {
      expect(logger.log).toHaveBeenCalledWith('[RedirectLoggedInUsers] Would redirect to sync in production');
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

    (usePrivy as jest.Mock).mockReturnValue({
      ready: true,
      authenticated: true,
    });

    render(<RedirectLoggedInUsers />);

    await waitFor(() => {
      expect(window.location.href).toBe('https://sync.negationgame.com');
    });
  });

  it('should only redirect once even if component re-renders', async () => {
    let redirectCount = 0;
    Object.defineProperty(window.location, 'href', {
      set: () => {
        redirectCount++;
      },
      configurable: true,
    });

    (usePrivy as jest.Mock).mockReturnValue({
      ready: true,
      authenticated: true,
    });

    const { rerender } = render(<RedirectLoggedInUsers />);

    await waitFor(() => {
      expect(redirectCount).toBe(1);
    });

    // Re-render the component
    rerender(<RedirectLoggedInUsers />);

    await waitFor(() => {
      // Should still be 1, not 2
      expect(redirectCount).toBe(1);
    });
  });
});
