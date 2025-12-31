import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Page from '../page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

jest.mock('@privy-io/react-auth', () => ({
  usePrivy: () => ({ authenticated: true, ready: true, login: jest.fn(), user: { id: 'me' } }),
}));

jest.mock('@/actions/experimental/rationales', () => ({
  listOwnedRationales: jest.fn(async () => ([
    { id: 'a', title: 'Mine', ownerId: 'me', updatedAt: new Date().toISOString(), createdAt: new Date().toISOString(), lastOpenAt: new Date().toISOString() },
    { id: 'p', title: 'Pinned Board', ownerId: 'me', updatedAt: new Date().toISOString(), createdAt: new Date().toISOString(), lastOpenAt: new Date().toISOString() },
  ])),
  listVisitedRationales: jest.fn(async () => ([
    { id: 'b', title: 'Theirs', ownerId: 'other', updatedAt: new Date().toISOString(), createdAt: new Date().toISOString(), lastOpenAt: new Date().toISOString() },
  ])),
  listPinnedRationales: jest.fn(async () => ([
    { id: 'p', title: 'Pinned Board', ownerId: 'me', updatedAt: new Date().toISOString(), createdAt: new Date().toISOString(), lastOpenAt: new Date().toISOString(), pinnedAt: new Date().toISOString() },
  ])),
  deleteRationale: jest.fn(async () => ({})),
  renameRationale: jest.fn(async () => ({})),
  createRationale: jest.fn(async () => ({ id: 'new' })),
  pinRationale: jest.fn(async () => ({})),
  unpinRationale: jest.fn(async () => ({})),
}));

jest.mock('@/actions/experimental/rationaleAccess', () => ({
  listAccessRequests: jest.fn(async () => ([
    {
      id: 'req-1',
      docId: 'a',
      docTitle: 'Mine',
      docSlug: 'mine',
      requesterId: 'u1',
      requesterUsername: 'requester',
      requestedRole: 'viewer',
      status: 'pending',
      createdAt: new Date().toISOString(),
    },
  ])),
  resolveAccessRequest: jest.fn(async () => ({ ok: true, status: 'approved' })),
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
        ids: ['n1'],
        count: 1,
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

describe('Multiplayer index page', () => {
  it('renders My Boards and lists docs', async () => {
    render(<Page />);
    expect(await screen.findByText(/My Boards/i)).toBeInTheDocument();
    const mineMatches = await screen.findAllByText('Mine');
    expect(mineMatches.length).toBeGreaterThan(0);
    expect(await screen.findByText('Theirs')).toBeInTheDocument();
    expect(await screen.findByText('Pinned boards')).toBeInTheDocument();
    expect(await screen.findByText('Access requests')).toBeInTheDocument();
    expect(await screen.findByText(/requester/i)).toBeInTheDocument();
    const pinnedMatches = await screen.findAllByText('Pinned Board');
    expect(pinnedMatches).toHaveLength(1);
    expect(await screen.findByTitle(/Notifications/i)).toBeInTheDocument();
  });

  it('opens board in new tab on meta click', async () => {
    const originalOpen = window.open;
    const openSpy = jest.fn();
    window.open = openSpy as unknown as typeof window.open;

    render(<Page />);
    const mineEntries = await screen.findAllByText('Mine');
    const card = mineEntries
      .map((entry) => entry.closest('[role="button"]'))
      .find((entry) => Boolean(entry));
    expect(card).not.toBeNull();
    fireEvent.click(card as HTMLElement, { metaKey: true });
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('/board/'),
      '_blank',
      'noopener'
    );

    window.open = originalOpen;
  });
});
