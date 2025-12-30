import { fireEvent, render, screen, within } from '@testing-library/react';
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

    const visible = screen.getByTestId('notifications-visible');
    fireEvent.click(within(visible).getByText(/Show \d+ other update/));

    expect(screen.getByText('Notifications')).toBeInTheDocument();
    baseNotifications.forEach((notification) => {
      if (notification.type === 'upvote') {
        expect(
          within(visible).getByText(
            new RegExp(`\\b\\d+\\s+upvote.*${notification.pointTitle}`)
          )
        ).toBeInTheDocument();
        return;
      }
      expect(
        within(visible).getByText(new RegExp(notification.userName))
      ).toBeInTheDocument();
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

    const visible = screen.getByTestId('notifications-visible');
    fireEvent.click(within(visible).getByText(/Show \d+ other update/));

    const unread = within(visible).getByTestId(`notification-item-${customNotifications[0].id}`);
    fireEvent.click(unread);

    expect(handleUpdate).toHaveBeenCalled();
    const updated = handleUpdate.mock.calls[0][0] as typeof customNotifications;
    expect(updated.find((n) => n.id === customNotifications[0].id)?.isRead).toBe(true);
    expect(handleRead).toHaveBeenCalled();
    const notified = handleRead.mock.calls[0][0] as typeof customNotifications[number];
    expect(notified.ids).toContain(customNotifications[0].id);
  });

  it('marks notifications as read when viewing unread notifications', () => {
    const handleRead = jest.fn();
    const handleNavigate = jest.fn();

    render(
      <NotificationsSidebar
        isOpen
        notifications={baseNotifications}
        onNotificationRead={handleRead}
        onNavigateToPoint={handleNavigate}
        onClose={() => {}}
      />
    );

    const visible = screen.getByTestId('notifications-visible');
    fireEvent.click(within(visible).getByText(/Show \d+ other update/));

    const viewButton = within(visible).getByTestId(`notification-view-${baseNotifications[0].id}`);
    fireEvent.click(viewButton);

    expect(handleRead).toHaveBeenCalled();
    expect(handleNavigate).toHaveBeenCalled();
  });

  it('does not re-mark notifications as read when already read', () => {
    const handleRead = jest.fn();
    const handleNavigate = jest.fn();

    render(
      <NotificationsSidebar
        isOpen
        notifications={baseNotifications}
        onNotificationRead={handleRead}
        onNavigateToPoint={handleNavigate}
        onClose={() => {}}
      />
    );

    const visible = screen.getByTestId('notifications-visible');
    fireEvent.click(within(visible).getByText(/Show \d+ other update/));

    const readNotification = baseNotifications.find((n) => n.isRead);
    if (!readNotification) {
      throw new Error("Expected a read notification in test data.");
    }
    const viewButton = within(visible).getByTestId(`notification-view-${readNotification.id}`);
    fireEvent.click(viewButton);

    expect(handleRead).not.toHaveBeenCalled();
    expect(handleNavigate).toHaveBeenCalled();
  });

  it('splits supporting, activity, and negative notifications', () => {
    render(
      <NotificationsSidebar
        isOpen
        notifications={baseNotifications}
        onClose={() => {}}
      />
    );

    const supportSection = screen.getByTestId('notifications-supporting-new');
    expect(
      within(supportSection).getByText(new RegExp(baseNotifications[1].pointTitle))
    ).toBeInTheDocument();
    expect(
      within(supportSection).queryByText(new RegExp(baseNotifications[2].pointTitle))
    ).not.toBeInTheDocument();

    const activitySection = screen.getByTestId('notifications-activity-new');
    expect(
      within(activitySection).getByText(new RegExp(baseNotifications[2].pointTitle))
    ).toBeInTheDocument();
    expect(
      within(activitySection).queryByText(new RegExp(baseNotifications[1].pointTitle))
    ).not.toBeInTheDocument();

    const visible = screen.getByTestId('notifications-visible');
    fireEvent.click(within(visible).getByText(/Show \d+ other update/));

    const negativeSection = screen.getByTestId('notifications-negative-new');
    expect(
      within(negativeSection).getByText(new RegExp(baseNotifications[0].pointTitle))
    ).toBeInTheDocument();

    const supportingEarlier = screen.getByTestId('notifications-supporting-earlier');
    expect(
      within(supportingEarlier).getByText(new RegExp(baseNotifications[4].pointTitle))
    ).toBeInTheDocument();
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

    const visible = screen.getByTestId('notifications-visible');
    const toggle = within(visible).getByRole('button', { name: /Show .*other update/ });
    expect(toggle).toBeInTheDocument();

    fireEvent.click(toggle);

    expect(within(visible).getByText(/Hide other activity/)).toBeInTheDocument();
  });
});
