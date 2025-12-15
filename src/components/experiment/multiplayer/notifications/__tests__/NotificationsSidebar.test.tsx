import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { NotificationsSidebar } from '@/components/experiment/multiplayer/notifications/NotificationsSidebar';
import type { MultiplayerNotification } from '@/components/experiment/multiplayer/notifications/types';

const baseNotifications: MultiplayerNotification[] = [
  {
    id: "1",
    boardId: "board-1",
    type: "negation",
    userName: "Sarah Chen",
    action: "negated your point",
    pointTitle: "Shared security increases governance risk",
    pointId: "point-1",
    timestamp: "2m ago",
    isRead: false,
    createdAt: new Date(Date.now() - 2 * 60 * 1000),
  },
  {
    id: "2",
    boardId: "board-2",
    type: "support",
    userName: "Michael Torres",
    action: "supported your argument",
    pointTitle: "Decentralized systems increase resilience",
    pointId: "point-2",
    timestamp: "15m ago",
    isRead: false,
    createdAt: new Date(Date.now() - 15 * 60 * 1000),
  },
  {
    id: "3",
    boardId: "board-1",
    type: "comment",
    userName: "Alex Kumar",
    action: "commented on",
    pointTitle: "Network effects create natural monopolies",
    pointId: "point-3",
    timestamp: "1h ago",
    isRead: false,
    createdAt: new Date(Date.now() - 60 * 60 * 1000),
    commentPreview:
      "I think this overlooks the role of switching costs. Even weak network effects can become monopolistic with high switching costs.",
  },
  {
    id: "4",
    boardId: "board-2",
    type: "objection",
    userName: "Jordan Lee",
    action: "objected to",
    pointTitle: "Coordination problems require centralized solutions",
    pointId: "point-4",
    timestamp: "3h ago",
    isRead: true,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
  },
  {
    id: "5",
    boardId: "board-2",
    type: "upvote",
    userName: "Taylor Park",
    action: "upvoted",
    pointTitle: "Incentive alignment is crucial for mechanism design",
    pointId: "point-5",
    timestamp: "Yesterday",
    isRead: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
];

describe('NotificationsSidebar', () => {
  it('renders front-facing names and supported notification types', () => {
    render(
      <NotificationsSidebar
        isOpen
        notifications={baseNotifications}
        onClose={() => {}}
      />
    );

    fireEvent.click(screen.getByText(/Show \d+ hidden negative action/));

    expect(screen.getByText('Notifications')).toBeInTheDocument();
    baseNotifications.forEach((notification) => {
      expect(screen.getByText(notification.userName)).toBeInTheDocument();
    });
  });

  it('marks notifications as read and informs parent', () => {
    const handleUpdate = jest.fn();
    const handleRead = jest.fn();
    const customNotifications = baseNotifications.map((notification, index) => ({
      ...notification,
      isRead: index !== 0,
    }));

    render(
      <NotificationsSidebar
        isOpen
        notifications={customNotifications}
        onNotificationsUpdate={handleUpdate}
        onNotificationRead={handleRead}
        onClose={() => {}}
      />
    );

    fireEvent.click(screen.getByText(/Show \d+ hidden negative action/));

    const unread = screen.getByText(customNotifications[0].pointTitle);
    fireEvent.click(unread.closest('button') as HTMLButtonElement);

    expect(handleUpdate).toHaveBeenCalled();
    const updated = handleUpdate.mock.calls[0][0] as typeof customNotifications;
    expect(updated.find((n) => n.id === customNotifications[0].id)?.isRead).toBe(true);
    expect(handleRead).toHaveBeenCalled();
    const notified = handleRead.mock.calls[0][0] as typeof customNotifications[number];
    expect(notified.ids).toContain(customNotifications[0].id);
  });

  it('shows new count for hidden negative actions until opened', () => {
    const hiddenNotifications: MultiplayerNotification[] = [
      {
        ...baseNotifications[0],
        id: 'hidden-1',
        type: 'objection',
        isRead: false,
        createdAt: new Date(Date.now() - 60_000),
      },
      {
        ...baseNotifications[0],
        id: 'hidden-2',
        type: 'negation',
        isRead: false,
        createdAt: new Date(Date.now() - 30_000),
      },
    ];

    render(
      <NotificationsSidebar
        isOpen
        notifications={[...hiddenNotifications, ...baseNotifications]}
        onClose={() => {}}
      />
    );

    const toggle = screen.getByRole('button', { name: /Show .*hidden negative actions/ });
    expect(toggle).toBeInTheDocument();
    expect(screen.getByText(/\(\d+ new\)/)).toBeInTheDocument();

    fireEvent.click(toggle);

    expect(screen.getByText(/Hide negative actions/)).toBeInTheDocument();
    expect(screen.queryByText(/\(.*new\)/i)).not.toBeInTheDocument();
  });
});
