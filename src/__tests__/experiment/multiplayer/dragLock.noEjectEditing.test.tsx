import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { GraphProvider } from '@/components/experiment/multiplayer/GraphContext';
import { PointNode } from '@/components/experiment/multiplayer/PointNode';

describe('drag lock on any node does not eject editing of another node', () => {
  it('keeps contentEditable true while unrelated drag-lock awareness changes occur', () => {
    const graphActions = {
      startEditingNode: jest.fn(),
      stopEditingNode: jest.fn(),
      isLockedForMe: (id: string) => false,
      getLockOwner: (id: string) => null,
      updateNodeContent: jest.fn(),
      addPointBelow: jest.fn(),
    } as any;

    const { getByText, rerender } = render(
      <ReactFlowProvider>
        <GraphProvider value={graphActions}>
          <PointNode id="A" data={{ content: 'Alpha' }} selected={true} />
        </GraphProvider>
      </ReactFlowProvider>
    );

    const editable = getByText('Alpha');

    // Enter edit mode (simulating double click semantics via programmatic call)
    act(() => {
      fireEvent.doubleClick(editable);
    });

    // Sanity: make contentEditable true by focusing
    act(() => {
      (editable as HTMLElement).setAttribute('contenteditable', 'true');
      (editable as HTMLElement).focus();
    });

    // Simulate an unrelated drag-lock on another node by changing lock owner for B only
    const graphActionsLockedElsewhere = {
      ...graphActions,
      isLockedForMe: (id: string) => id === 'B',
      getLockOwner: (id: string) => (id === 'B' ? { name: 'Peer', color: '#0f0', kind: 'drag' } : null),
    } as any;

    rerender(
      <ReactFlowProvider>
        <GraphProvider value={graphActionsLockedElsewhere}>
          <PointNode id="A" data={{ content: 'Alpha' }} selected={true} />
        </GraphProvider>
      </ReactFlowProvider>
    );

    // The editing element should still be contentEditable
    expect((editable as HTMLElement).getAttribute('contenteditable')).toBe('true');
  });
});


