import React from 'react';
import { render, screen } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MultiplayerHeader } from '../../multiplayer/MultiplayerHeader';

describe('MultiplayerHeader status messaging', () => {
  const baseProps = {
    username: 'User',
    userColor: '#000',
    provider: null,
    isConnected: true,
    connectionError: null as string | null,
    isSaving: false,
    proxyMode: false,
    userId: 'u1',
    onResyncNow: () => { },
  };

  it('does not show status when connected with no error', () => {
    render(
      <TooltipProvider>
        <MultiplayerHeader {...baseProps} />
      </TooltipProvider>
    );
    expect(screen.queryByText(/collaboration server/i)).toBeNull();
    expect(screen.queryByText(/Unable to connect/i)).toBeNull();
  });

  it('shows connecting message when connectionState=connecting', () => {
    render(
      <TooltipProvider>
        <MultiplayerHeader {...baseProps} isConnected={false} connectionState="connecting" />
      </TooltipProvider>
    );
    expect(screen.getByText(/Connecting to collaboration server/i)).toBeInTheDocument();
  });

  it('shows failure message when connectionState=failed and no explicit error', () => {
    render(
      <TooltipProvider>
        <MultiplayerHeader {...baseProps} isConnected={false} connectionState="failed" />
      </TooltipProvider>
    );
    expect(screen.getByText(/Unable to connect/i)).toBeInTheDocument();
  });

  it('shows user-friendly error message for generic errors', () => {
    render(
      <TooltipProvider>
        <MultiplayerHeader
          {...baseProps}
          isConnected={false}
          connectionState="failed"
          connectionError="Some random error"
        />
      </TooltipProvider>
    );
    expect(screen.getByText(/Connection issue/i)).toBeInTheDocument();
  });

  it('shows disconnected status with Retry when disconnected', () => {
    render(
      <TooltipProvider>
        <MultiplayerHeader
          {...baseProps}
          isConnected={false}
          connectionState="connecting"
        />
      </TooltipProvider>
    );
    expect(screen.getByText(/Connecting to collaboration server/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Retry/i).length).toBeGreaterThan(0);
  });
});


