import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { NotificationsSidebar } from '@/components/experiment/multiplayer/notifications/NotificationsSidebar';
import { demoNotifications } from '@/components/experiment/multiplayer/notifications/demoData';

describe('NotificationsSidebar', () => {
  it('renders front-facing names and supported notification types', () => {
    render(
      <NotificationsSidebar
        isOpen
        notifications={demoNotifications}
        onClose={() => {}}
      />
    );

    fireEvent.click(screen.getByText(/Show \d+ negative notification/));

    expect(screen.getByText('Notifications')).toBeInTheDocument();
    demoNotifications.forEach((notification) => {
      expect(screen.getByText(notification.userName)).toBeInTheDocument();
    });
    expect(screen.getByText('Upvote')).toBeInTheDocument();
  });

  it('marks notifications as read and informs parent', () => {
    const handleUpdate = jest.fn();
    const handleRead = jest.fn();
    const customNotifications = demoNotifications.map((notification, index) => ({
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

    fireEvent.click(screen.getByText(/Show \d+ negative notification/));

    const unread = screen.getByText(customNotifications[0].pointTitle);
    fireEvent.click(unread.closest('button') as HTMLButtonElement);

    expect(handleUpdate).toHaveBeenCalled();
    const updated = handleUpdate.mock.calls[0][0] as typeof customNotifications;
    expect(updated.find((n) => n.id === customNotifications[0].id)?.isRead).toBe(true);
    expect(handleRead).toHaveBeenCalledWith(customNotifications[0].id);
  });
});
