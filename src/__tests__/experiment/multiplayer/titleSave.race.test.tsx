import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MultiplayerHeader } from '@/components/experiment/multiplayer/MultiplayerHeader';

describe('MultiplayerHeader title save uses latest value at save time', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        (global as any).fetch = jest.fn().mockResolvedValue({ ok: true });
    });

    afterEach(() => {
        jest.useRealTimers();
        (global as any).fetch = undefined;
    });

    it('saves the title typed before countdown starts, using latest value', async () => {
        const onTitleChange = jest.fn();

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
                    documentId="doc-1"
                    onTitleChange={onTitleChange}
                />
            </TooltipProvider>
        );

        const input = container.querySelector('input') as HTMLInputElement;
        expect(input).toBeTruthy();

        // Type title fully, then wait for autosave
        await act(async () => {
            fireEvent.change(input, { target: { value: 'Hello!' } });
        });

        // 1.5s idle to start countdown
        await act(async () => {
            jest.advanceTimersByTime(1500);
        });

        // Countdown 5 seconds
        await act(async () => {
            jest.advanceTimersByTime(5000);
        });

        // Final 1s save
        await act(async () => {
            jest.advanceTimersByTime(1000);
        });

        // Assert fetch called with latest value including '!'
        expect(global.fetch).toHaveBeenCalledTimes(1);
        const body = JSON.parse(((global.fetch as any).mock.calls[0][1] as any).body);
        expect(body.title).toBe('Hello!');

        // onTitleChange should receive the full latest title
        expect(onTitleChange).toHaveBeenCalledWith('Hello!');
    });
});


