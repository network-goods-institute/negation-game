import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MultiplayerHeader } from '@/components/experiment/multiplayer/MultiplayerHeader';

describe('MultiplayerHeader title save JSON handling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    (global as any).fetch = undefined;
  });

  it('updates URL when server returns slug and id JSON', async () => {
    const onTitleChange = jest.fn();
    const onUrlUpdate = jest.fn();
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ id: 'x1', slug: 'hello' })
    });

    const { container } = render(
      <TooltipProvider>
        <MultiplayerHeader
          username="u"
          userColor="#000"
          provider={null}
          isConnected={true}
          connectionError={null}
          isSaving={false}
          nextSaveTime={null}
          proxyMode={false}
          userId="user"
          title="Untitled"
          documentId="doc-2"
          onTitleChange={onTitleChange}
          onUrlUpdate={onUrlUpdate}
        />
      </TooltipProvider>
    );

    const input = container.querySelector('input') as HTMLInputElement;

    await act(async () => {
      fireEvent.change(input, { target: { value: 'Hello' } });
    });

    await act(async () => {
      jest.advanceTimersByTime(1500);
    });

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(onTitleChange).toHaveBeenCalledWith('Hello');
    expect(onUrlUpdate).toHaveBeenCalledWith('x1', 'hello');
  });
});

