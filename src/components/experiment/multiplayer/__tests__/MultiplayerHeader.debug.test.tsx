/**
 * Debug visual test for MultiplayerHeader error states
 *
 * To view all error states visually during development:
 * 1. Pass `debugShowAllStates={true}` to the MultiplayerHeader component
 * 2. This will render all possible error messages and buttons in a debug section
 * 3. Useful for visual inspection and styling adjustments
 *
 * Example usage in MultiplayerBoardContent:
 * ```tsx
 * <MultiplayerHeader
 *   {...props}
 *   debugShowAllStates={process.env.NODE_ENV === 'development'}
 * />
 * ```
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MultiplayerHeader } from '../MultiplayerHeader';

describe('MultiplayerHeader debug mode', () => {
  const baseProps = {
    username: 'Test User',
    userColor: '#3b82f6',
    provider: null,
    isConnected: true,
    connectionError: null,
    isSaving: false,
    userId: 'test-user-id',
  };

  const renderWithTooltip = (component: React.ReactElement) => {
    return render(<TooltipProvider>{component}</TooltipProvider>);
  };

  it('renders carousel when debugShowAllStates is true', () => {
    renderWithTooltip(<MultiplayerHeader {...baseProps} debugShowAllStates={true} />);

    // Should show carousel with state counter (e.g., "1/6")
    expect(screen.getByText(/\(1\/6\)/i)).toBeInTheDocument();
  });

  it('does not render carousel when debugShowAllStates is false and connected', () => {
    renderWithTooltip(<MultiplayerHeader {...baseProps} debugShowAllStates={false} />);

    // Should not show carousel counter when connected with no errors
    expect(screen.queryByText(/\(1\/6\)/i)).not.toBeInTheDocument();
  });

  it('does not render carousel by default when connected', () => {
    renderWithTooltip(<MultiplayerHeader {...baseProps} />);

    // Should not show carousel counter by default when connected
    expect(screen.queryByText(/\(1\/6\)/i)).not.toBeInTheDocument();
  });

  it('shows error state variations in debug mode via carousel', () => {
    const { container } = renderWithTooltip(<MultiplayerHeader {...baseProps} debugShowAllStates={true} />);

    // Should show carousel with 6 total states
    expect(screen.getByText(/\(1\/6\)/i)).toBeInTheDocument();

    // Should show the first error message (Connecting)
    expect(screen.getByText(/Connecting to collaboration server/i)).toBeInTheDocument();

    // Should have navigation buttons
    const nextButtons = screen.getAllByTitle(/Next state/i);
    expect(nextButtons.length).toBeGreaterThan(0);
  });

  it('shows retry button in debug mode for current state', () => {
    renderWithTooltip(<MultiplayerHeader {...baseProps} debugShowAllStates={true} />);

    // Should have at least one retry button for the current visible state
    const retryButtons = screen.getAllByRole('button', { name: /retry/i });
    expect(retryButtons.length).toBeGreaterThan(0);
  });

  it('can navigate carousel to show reload button for auth expired state', () => {
    renderWithTooltip(<MultiplayerHeader {...baseProps} debugShowAllStates={true} />);

    // Start at state 1, need to navigate to AUTH_EXPIRED state (state 4)
    // Click next button multiple times to reach it
    const nextButton = screen.getByTitle(/Next state/i);

    // Navigate through: Connecting (1) -> Failed (2) -> Disconnected (3) -> Auth Expired (4)
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);

    // Should now show reload button for AUTH_EXPIRED state
    const reloadButtons = screen.getAllByRole('button', { name: /reload/i });
    expect(reloadButtons.length).toBeGreaterThan(0);
  });
});
