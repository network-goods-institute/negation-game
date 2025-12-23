import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
  ])),
  listVisitedRationales: jest.fn(async () => ([
    { id: 'b', title: 'Theirs', ownerId: 'other', updatedAt: new Date().toISOString(), createdAt: new Date().toISOString(), lastOpenAt: new Date().toISOString() },
  ])),
  deleteRationale: jest.fn(async () => ({})),
  renameRationale: jest.fn(async () => ({})),
  createRationale: jest.fn(async () => ({ id: 'new' })),
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

describe('Multiplayer index page', () => {
  it('renders My Boards and lists docs', async () => {
    render(<Page />);
    expect(await screen.findByText(/My Boards/i)).toBeInTheDocument();
    expect(await screen.findByText('Mine')).toBeInTheDocument();
    expect(await screen.findByText('Theirs')).toBeInTheDocument();
    expect(await screen.findByText(/NOTIFY/i)).toBeInTheDocument();
  });
});
