import React from 'react';
import { render, screen } from '@/lib/tests/test-utils';
import { ConnectButton } from '../ConnectButton';
import { usePrivy } from '@privy-io/react-auth';
import { useUser } from '@/queries/users/useUser';
import { useUnreadNotificationCount } from '@/queries/notifications/useNotifications';
import { useUnreadMessageCount } from '@/queries/messages/useUnreadMessageCount';
import { useIncompleteAssignmentCount } from '@/queries/assignments/useIncompleteAssignmentCount';
import { useAdminStatus } from '@/hooks/admin/useAdminStatus';
import { isFeatureEnabled } from '@/lib/featureFlags';

// Mock the UI dropdown menu components directly
jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children, asChild }: any) =>
    asChild ? children : <button data-testid="dropdown-trigger">{children}</button>,
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children }: any) => <div data-testid="dropdown-item">{children}</div>,
  DropdownMenuLabel: ({ children }: any) => <div data-testid="dropdown-label">{children}</div>,
  DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
  DropdownMenuSub: ({ children }: any) => <div data-testid="dropdown-sub">{children}</div>,
  DropdownMenuSubTrigger: ({ children }: any) => <div data-testid="dropdown-sub-trigger">{children}</div>,
  DropdownMenuSubContent: ({ children }: any) => <div data-testid="dropdown-sub-content">{children}</div>,
}));

// Mock dialogs
jest.mock('@/components/dialogs/EarningsDialog', () => ({
  EarningsDialog: () => null,
}));
jest.mock('@/components/dialogs/LeaderboardDialog', () => ({
  LeaderboardDialog: () => null,
}));
jest.mock('@/components/dialogs/UsernameSignupDialog', () => ({
  UsernameSignupDialog: () => null,
}));

jest.mock('@privy-io/react-auth', () => ({
  usePrivy: jest.fn(),
}));
jest.mock('@/queries/users/useUser', () => ({
  useUser: jest.fn(),
}));
jest.mock('@/queries/notifications/useNotifications', () => ({
  useUnreadNotificationCount: jest.fn(),
}));
jest.mock('@/queries/messages/useUnreadMessageCount', () => ({
  useUnreadMessageCount: jest.fn(),
}));
jest.mock('@/queries/assignments/useIncompleteAssignmentCount', () => ({
  useIncompleteAssignmentCount: jest.fn(),
}));
jest.mock('@/hooks/admin/useAdminStatus', () => ({
  useAdminStatus: jest.fn(),
}));
jest.mock('@/lib/featureFlags', () => ({
  isFeatureEnabled: jest.fn(),
}));
jest.mock('@/hooks/auth/useEnsureUser', () => ({
  useEnsureUser: jest.fn(),
}));
jest.mock('@/actions/users/auth', () => ({
  clearPrivyCookie: jest.fn(),
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ prefetch: jest.fn() }),
  usePathname: () => '/s/global',
}));

describe('ConnectButton - Notification Badge', () => {
  const mockUser = {
    id: 'user-1',
    username: 'testuser',
    cred: 100,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    (usePrivy as jest.Mock).mockImplementation(() => ({
      ready: true,
      authenticated: true,
      user: { id: 'user-1' },
      login: jest.fn(),
      logout: jest.fn(),
    }));

    (useUser as jest.Mock).mockImplementation(() => ({
      data: mockUser,
      isLoading: false,
    }));

    (useAdminStatus as jest.Mock).mockImplementation(() => ({
      data: null,
    }));

    (useUnreadMessageCount as jest.Mock).mockImplementation(() => ({
      data: 0,
    }));

    (useIncompleteAssignmentCount as jest.Mock).mockImplementation(() => 0);
  });

  describe('when notifications are enabled', () => {
    beforeEach(() => {
      (isFeatureEnabled as jest.Mock).mockImplementation(() => true);
    });

    it('shows badge when there are unread notifications', () => {
      (useUnreadNotificationCount as jest.Mock).mockImplementation(() => ({
        data: 5,
      }));

      render(<ConnectButton />);

      const button = screen.getByRole('button', { name: /testuser/i });
      const badge = button.querySelector('.bg-destructive');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('5');
    });

    it('shows combined count for notifications and messages', () => {
      (useUnreadNotificationCount as jest.Mock).mockImplementation(() => ({
        data: 3,
      }));
      (useUnreadMessageCount as jest.Mock).mockImplementation(() => ({
        data: 2,
      }));

      render(<ConnectButton />);

      const button = screen.getByRole('button', { name: /testuser/i });
      const badge = button.querySelector('.bg-destructive');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('5');
    });

    it('shows combined count for notifications, messages, and assignments', () => {
      (useUnreadNotificationCount as jest.Mock).mockImplementation(() => ({
        data: 3,
      }));
      (useUnreadMessageCount as jest.Mock).mockImplementation(() => ({
        data: 2,
      }));
      (useIncompleteAssignmentCount as jest.Mock).mockImplementation(() => 4);

      render(<ConnectButton />);

      const button = screen.getByRole('button', { name: /testuser/i });
      const badge = button.querySelector('.bg-destructive');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('9');
    });

    it('shows "99+" when count exceeds 99', () => {
      (useUnreadNotificationCount as jest.Mock).mockImplementation(() => ({
        data: 100,
      }));

      render(<ConnectButton />);

      const button = screen.getByRole('button', { name: /testuser/i });
      const badge = button.querySelector('.bg-destructive');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('99+');
    });
  });

    describe('when notifications are disabled', () => {
    beforeEach(() => {
      (isFeatureEnabled as jest.Mock).mockImplementation(() => false);
    });

    it('does not show badge for cached notification counts', () => {
      // Simulate cached notification data from when feature was enabled
      (useUnreadNotificationCount as jest.Mock).mockImplementation(() => ({
        data: 5, // Stale cached data
      }));

      render(<ConnectButton />);

      // Badge should not appear because notifications are disabled
      expect(screen.queryByText('5')).not.toBeInTheDocument();
    });

    it('hides notification badges entirely when feature is disabled', () => {
      (useUnreadNotificationCount as jest.Mock).mockImplementation(() => ({
        data: 5,
      }));
      (useUnreadMessageCount as jest.Mock).mockImplementation(() => ({
        data: 3,
      }));
      (useIncompleteAssignmentCount as jest.Mock).mockImplementation(() => 2);

      render(<ConnectButton />);

      const button = screen.getByRole('button', { name: /testuser/i });
      expect(button.querySelector('.bg-destructive')).not.toBeInTheDocument();
    });

    it('does not render aggregate badges when notifications feature is disabled', () => {
      (useUnreadNotificationCount as jest.Mock).mockImplementation(() => ({
        data: 10,
      }));
      (useUnreadMessageCount as jest.Mock).mockImplementation(() => ({
        data: 4,
      }));
      (useIncompleteAssignmentCount as jest.Mock).mockImplementation(() => 6);

      render(<ConnectButton />);

      const button = screen.getByRole('button', { name: /testuser/i });
      expect(button.querySelector('.bg-destructive')).not.toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles undefined notification count when feature is disabled', () => {
      (isFeatureEnabled as jest.Mock).mockImplementation(() => false);
      (useUnreadNotificationCount as jest.Mock).mockImplementation(() => ({
        data: undefined,
      }));
      (useUnreadMessageCount as jest.Mock).mockImplementation(() => ({
        data: 2,
      }));

      render(<ConnectButton />);

      const button = screen.getByRole('button', { name: /testuser/i });
      expect(button.querySelector('.bg-destructive')).not.toBeInTheDocument();
    });

    it('handles null notification count when feature is disabled', () => {
      (isFeatureEnabled as jest.Mock).mockImplementation(() => false);
      (useUnreadNotificationCount as jest.Mock).mockImplementation(() => ({
        data: null,
      }));
      (useUnreadMessageCount as jest.Mock).mockImplementation(() => ({
        data: 1,
      }));

      render(<ConnectButton />);

      const button = screen.getByRole('button', { name: /testuser/i });
      expect(button.querySelector('.bg-destructive')).not.toBeInTheDocument();
    });
  });
});

