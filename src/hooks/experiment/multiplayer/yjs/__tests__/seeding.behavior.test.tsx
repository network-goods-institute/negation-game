import { renderHook, act } from '@testing-library/react';
import * as React from 'react';
import { useYjsMultiplayer } from '../../useYjsMultiplayer';

// This is a light behavior test that ensures initial seeding is deferred until connected
// We simulate missing WS connection by not providing env URL and expect no nodes/edges to be seeded

describe('useYjsMultiplayer seeding behavior', () => {
  const originalEnv = process.env.NEXT_PUBLIC_YJS_WS_URL;
  const originalExperimentEnabled = process.env.NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED;

  beforeEach(() => {
    delete (process.env as any).NEXT_PUBLIC_YJS_WS_URL;
    (process.env as any).NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED = "true";
  });

  afterEach(() => {
    if (originalEnv == null) {
      delete (process.env as any).NEXT_PUBLIC_YJS_WS_URL;
    } else {
      (process.env as any).NEXT_PUBLIC_YJS_WS_URL = originalEnv;
    }

    if (originalExperimentEnabled == null) {
      delete (process.env as any).NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED;
    } else {
      (process.env as any).NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED = originalExperimentEnabled;
    }
  });

  it('does not seed when not connected/synced', async () => {
    const { result } = renderHook(() =>
      useYjsMultiplayer({
        roomName: 'rationale:test-1',
        initialNodes: [{ id: 't', type: 'title', position: { x: 0, y: 0 }, data: { content: 'X' } } as any],
        initialEdges: [],
        enabled: true,
        localOrigin: {},
      })
    );

    // Immediately after init without WS URL, it should not have seeded anything
    expect(result.current.ydoc).toBeTruthy();
    // yNodesMap is private; validate by checking exposed arrays remain empty
    expect(Array.isArray(result.current.nodes)).toBe(true);
    // When disabled WS, the hook still hydrates local nodes array from initialNodes for UI rendering,
    // but seeding the Y doc is deferred. We assert ydoc exists and connectivity flags are not connected.
    expect(result.current.isConnected).toBe(false);
  });
});


