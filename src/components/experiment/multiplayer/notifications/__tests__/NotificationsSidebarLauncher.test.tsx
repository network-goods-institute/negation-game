import React from 'react';
import { render } from '@testing-library/react';
import { NotificationsSidebarLauncher } from '@/components/experiment/multiplayer/notifications/NotificationsSidebarLauncher';

const mockPush = jest.fn();
const notificationsSidebarMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/components/experiment/multiplayer/notifications/NotificationsSidebar', () => ({
  NotificationsSidebar: (props: unknown) => {
    notificationsSidebarMock(props);
    return <div data-testid="notifications-sidebar" />;
  },
}));

jest.mock('@/queries/experiment/multiplayer/useMultiplayerNotifications', () => ({
  useAllMultiplayerNotifications: () => ({
    data: [
      {
        id: 'n1',
        boardId: 'board-1',
        boardTitle: 'Board One',
        type: 'support',
        userName: 'Alex',
        action: 'supported',
        pointTitle: 'Test point',
        pointId: 'p1',
        timestamp: '2m ago',
        isRead: false,
        createdAt: new Date(),
      },
    ],
    isLoading: false,
    isFetching: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('@/mutations/experiment/multiplayer/useMarkMultiplayerNotificationsRead', () => ({
  useMarkMultiplayerNotificationRead: () => ({ mutateAsync: jest.fn() }),
  useMarkAllMultiplayerNotificationsRead: () => ({ mutateAsync: jest.fn() }),
}));

jest.mock('@/actions/experimental/rationales', () => ({
  recordOpen: jest.fn(async () => ({})),
}));

describe('NotificationsSidebarLauncher', () => {
  beforeEach(() => {
    notificationsSidebarMock.mockClear();
    mockPush.mockClear();
  });

  it('passes board context props to sidebar', () => {
    render(<NotificationsSidebarLauncher />);
    expect(notificationsSidebarMock).toHaveBeenCalled();
    const props = notificationsSidebarMock.mock.calls[notificationsSidebarMock.mock.calls.length - 1][0] as {
      showBoardContext?: boolean;
      linkLabel?: string;
    };
    expect(props.showBoardContext).toBe(true);
    expect(props.linkLabel).toBe('View board');
  });

  it('navigates to board when clicking a global notification', () => {
    render(<NotificationsSidebarLauncher />);
    const props = notificationsSidebarMock.mock.calls[notificationsSidebarMock.mock.calls.length - 1][0] as {
      onNavigateToPoint: (pointId: string, boardId?: string) => void;
    };
    props.onNavigateToPoint('point-1', 'board-1');
    expect(mockPush).toHaveBeenCalledWith('/experiment/rationale/multiplayer/board-1');
  });
});
