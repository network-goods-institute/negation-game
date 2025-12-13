import { render, screen } from '@testing-library/react';
import React from 'react';
import { NotificationsPanel } from '@/components/experiment/multiplayer/notifications/NotificationsPanel';
import { demoBoardSummaries } from '@/components/experiment/multiplayer/notifications/demoData';

describe('NotificationsPanel', () => {
  it('computes totals from multiplayer demo data', () => {
    render(<NotificationsPanel isOpen onClose={() => {}} summaries={demoBoardSummaries} />);

    const expectedTotal = demoBoardSummaries.reduce(
      (sum, board) => sum + board.notifications.length,
      0
    );

    expect(screen.getAllByText('View Board')).toHaveLength(demoBoardSummaries.length);
    expect(screen.getByText(String(expectedTotal))).toBeInTheDocument();
  });
});
