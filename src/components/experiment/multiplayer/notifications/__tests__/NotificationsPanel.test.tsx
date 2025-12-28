import { render, screen } from '@testing-library/react';
import React from 'react';
import { NotificationsPanel } from '@/components/experiment/multiplayer/notifications/NotificationsPanel';
import type { MultiplayerBoardNotificationSummary } from '@/components/experiment/multiplayer/notifications/types';

const boardSummaries: MultiplayerBoardNotificationSummary[] = [
  {
    boardId: "board-1",
    boardTitle: "Mechanism Design Workshop",
    notifications: [
      { type: "negation", message: 'Sarah Chen negated "Market fees should stay flat"' },
      { type: "support", message: 'Michael Torres supported "Auctions align incentives"' },
      { type: "comment", message: "Alex Kumar left a comment on your proposal" },
    ],
  },
  {
    boardId: "board-2",
    boardTitle: "Decentralization Tradeoffs",
    notifications: [
      { type: "objection", message: "Jordan Lee objected to the coordination plan" },
      { type: "upvote", message: "Taylor Park upvoted your point on validator rewards" },
    ],
  },
];

describe('NotificationsPanel', () => {
  it('computes totals from multiplayer demo data', () => {
    render(<NotificationsPanel isOpen onClose={() => {}} summaries={boardSummaries} />);

    const expectedTotal = boardSummaries.reduce(
      (sum, board) => sum + board.notifications.length,
      0
    );

    expect(screen.getAllByText('View Board')).toHaveLength(boardSummaries.length);
    expect(screen.getByText(String(expectedTotal))).toBeInTheDocument();
  });
});
