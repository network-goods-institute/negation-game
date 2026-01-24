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

  it('shows read negative notifications in the main flow without hiding', () => {
    const readNegativeNotifications: MultiplayerNotification[] = [
      {
        id: 'read-neg-1',
        boardId: 'board-1',
        type: 'negation',
        userName: 'User A',
        action: 'negated',
        pointTitle: 'Read negation point',
        pointId: 'point-read-neg-1',
        timestamp: '5h ago',
        isRead: true,
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      },
      {
        id: 'read-obj-1',
        boardId: 'board-1',
        type: 'objection',
        userName: 'User B',
        action: 'objected to',
        pointTitle: 'Read objection point',
        pointId: 'point-read-obj-1',
        timestamp: '6h ago',
        isRead: true,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      },
    ];

    render(
      <NotificationsSidebar
        isOpen
        notifications={readNegativeNotifications}
        onClose={() => {}}
      />
    );

    const visible = screen.getByTestId('notifications-visible');
    // Read negative notifications should appear in the earlier negative section
    const earlierNegativeSection = screen.getByTestId('notifications-negative-earlier');
    expect(
      within(earlierNegativeSection).getByText(/Read negation point/)
    ).toBeInTheDocument();
    expect(
      within(earlierNegativeSection).getByText(/Read objection point/)
    ).toBeInTheDocument();

    // There should be no "other activity" card for read-only negative notifications
    expect(
      within(visible).queryByRole('button', { name: /Show .*other update/ })
    ).not.toBeInTheDocument();
  });

  it('shows unread negative behind hidden card but read negative in main flow', () => {
    const mixedNegativeNotifications: MultiplayerNotification[] = [
      {
        id: 'unread-neg-1',
        boardId: 'board-1',
        type: 'negation',
        userName: 'User A',
        action: 'negated',
        pointTitle: 'Unread negation',
        pointId: 'point-unread-neg',
        timestamp: '1m ago',
        isRead: false,
        createdAt: new Date(Date.now() - 60 * 1000),
      },
      {
        id: 'read-neg-1',
        boardId: 'board-1',
        type: 'negation',
        userName: 'User B',
        action: 'negated',
        pointTitle: 'Read negation',
        pointId: 'point-read-neg',
        timestamp: '5h ago',
        isRead: true,
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      },
    ];

    render(
      <NotificationsSidebar
        isOpen
        notifications={mixedNegativeNotifications}
        onClose={() => {}}
      />
    );

    const visible = screen.getByTestId('notifications-visible');

    // Should show "other activity" card for the unread negative
    const toggle = within(visible).getByRole('button', { name: /Show .*other update/ });
    expect(toggle).toBeInTheDocument();

    // Read negative should already be visible in earlier section
    const earlierNegativeSection = screen.getByTestId('notifications-negative-earlier');
    expect(
      within(earlierNegativeSection).getByText(/Read negation/)
    ).toBeInTheDocument();

    // Expand to see unread negative
    fireEvent.click(toggle);
    const newNegativeSection = screen.getByTestId('notifications-negative-new');
    expect(
      within(newNegativeSection).getByText(/Unread negation/)
    ).toBeInTheDocument();
  });

  it('shows all notifications without type categorization in site-level view', () => {
    const mixedNotifications: MultiplayerNotification[] = [
      {
        id: 'unread-neg-1',
        boardId: 'board-1',
        boardTitle: 'Board A',
        type: 'negation',
        userName: 'User A',
        action: 'negated',
        pointTitle: 'Unread negation',
        pointId: 'point-unread-neg',
        timestamp: '1m ago',
        isRead: false,
        createdAt: new Date(Date.now() - 60 * 1000),
      },
      {
        id: 'unread-support-1',
        boardId: 'board-2',
        boardTitle: 'Board B',
        type: 'support',
        userName: 'User B',
        action: 'supported',
        pointTitle: 'Unread support',
        pointId: 'point-unread-support',
        timestamp: '2m ago',
        isRead: false,
        createdAt: new Date(Date.now() - 2 * 60 * 1000),
      },
      {
        id: 'read-comment-1',
        boardId: 'board-3',
        boardTitle: 'Board C',
        type: 'comment',
        userName: 'User C',
        action: 'commented on',
        pointTitle: 'Read comment',
        pointId: 'point-read-comment',
        timestamp: '1h ago',
        isRead: true,
        createdAt: new Date(Date.now() - 60 * 60 * 1000),
      },
    ];

    render(
      <NotificationsSidebar
        isOpen
        notifications={mixedNotifications}
        onClose={() => {}}
        showBoardContext
      />
    );

    const visible = screen.getByTestId('notifications-visible');

    // In site-level view, there should be NO "other activity" hidden card
    expect(
      within(visible).queryByRole('button', { name: /Show .*other update/ })
    ).not.toBeInTheDocument();

    // Site-level view should have simple "New activity" section (not categorized by type)
    const newSection = screen.getByTestId('notifications-new');
    // Both unread notifications should be in the same section
    expect(within(newSection).getByText(/User A/)).toBeInTheDocument();
    expect(within(newSection).getByText(/User B/)).toBeInTheDocument();
    expect(within(newSection).getByText(/Board A/)).toBeInTheDocument();
    expect(within(newSection).getByText(/Board B/)).toBeInTheDocument();

    // Read notifications should be in "Earlier activity"
    const earlierSection = screen.getByTestId('notifications-earlier');
    expect(within(earlierSection).getByText(/User C/)).toBeInTheDocument();
    expect(within(earlierSection).getByText(/Board C/)).toBeInTheDocument();

    // There should NOT be type-specific sections in site-level view
    expect(screen.queryByTestId('notifications-supporting-new')).not.toBeInTheDocument();
    expect(screen.queryByTestId('notifications-negative-new')).not.toBeInTheDocument();
  });
});
