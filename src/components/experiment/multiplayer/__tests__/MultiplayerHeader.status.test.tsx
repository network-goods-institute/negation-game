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
    onResyncNow: () => {},
  };

  it('does not show status when connected with no error', () => {
    render(
      <TooltipProvider>
        <MultiplayerHeader {...baseProps} />
      </TooltipProvider>
    );
    expect(screen.queryByText(/Connecting to server/i)).toBeNull();
    expect(screen.queryByText(/Connection failed/i)).toBeNull();
  });

  it('shows connecting message when connectionState=connecting', () => {
    render(
      <TooltipProvider>
        <MultiplayerHeader {...baseProps} isConnected={false} connectionState="connecting" />
      </TooltipProvider>
    );
    expect(screen.getByText(/Connecting to server/i)).toBeInTheDocument();
  });

  it('shows failure message when connectionState=failed and no explicit error', () => {
    render(
      <TooltipProvider>
        <MultiplayerHeader {...baseProps} isConnected={false} connectionState="failed" />
      </TooltipProvider>
    );
    expect(screen.getByText(/Connection failed/i)).toBeInTheDocument();
  });

  it('shows explicit connectionError over state text', () => {
    render(
      <TooltipProvider>
        <MultiplayerHeader
          {...baseProps}
          isConnected={false}
          connectionState="failed"
          connectionError="Auth error"
        />
      </TooltipProvider>
    );
    expect(screen.getByText(/Auth error/i)).toBeInTheDocument();
  });
});


