import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Page from '../page';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
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
  createRationaleFromDocument: jest.fn(async () => ({ id: 'new-doc' })),
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

const mockedRationales = jest.requireMock('@/actions/experimental/rationales');

describe('Multiplayer index page', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockedRationales.createRationaleFromDocument.mockResolvedValue({ id: 'new-doc', slug: null });
  });

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

  it('opens create dialog with document and fresh options', async () => {
    render(<Page />);
    const newBoardButton = await screen.findByRole('button', { name: 'New Board' });
    fireEvent.click(newBoardButton);

    expect(await screen.findByText('Create board')).toBeInTheDocument();
    expect(await screen.findByText('Build from document')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Start fresh' })).toBeInTheDocument();
  });

  it('allows clicking anywhere in the upload panel to trigger file input', async () => {
    render(<Page />);
    fireEvent.click(await screen.findByRole('button', { name: 'New Board' }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    const clickHandler = jest.fn();
    fileInput.addEventListener('click', clickHandler);

    fireEvent.click(await screen.findByText('Accepted: txt, md, rtf up to 2MB'));

    expect(clickHandler).toHaveBeenCalled();
  });

  it('submits document text through createRationaleFromDocument', async () => {
    render(<Page />);
    fireEvent.click(await screen.findByRole('button', { name: 'New Board' }));
    const textarea = await screen.findByPlaceholderText('Paste transcript text here...');
    fireEvent.change(textarea, { target: { value: 'Moderator: Should we ship now?\nAlex: Ship now for adoption.\nBlair: Delay for reliability.\nCasey: Compare tradeoffs.' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Create from document' }));

    await waitFor(() => {
      expect(mockedRationales.createRationaleFromDocument).toHaveBeenCalledWith({
        documentText: expect.stringContaining('Should we ship now?'),
      });
    });
    expect(mockPush).toHaveBeenCalled();
  });

  it('auto-creates board immediately when a file is uploaded', async () => {
    render(<Page />);
    fireEvent.click(await screen.findByRole('button', { name: 'New Board' }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    const file = new File(['Speaker A: We should prioritize speed.\nSpeaker B: We should prioritize reliability.\nSpeaker C: We should evaluate tradeoffs.'], 'transcript.txt', { type: 'text/plain' });
    Object.defineProperty(file, 'text', {
      value: async () => 'Speaker A: We should prioritize speed.\nSpeaker B: We should prioritize reliability.\nSpeaker C: We should evaluate tradeoffs.',
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockedRationales.createRationaleFromDocument).toHaveBeenCalledWith({
        documentText: expect.stringContaining('prioritize speed'),
      });
    });
    expect(mockPush).toHaveBeenCalled();
  });
});
