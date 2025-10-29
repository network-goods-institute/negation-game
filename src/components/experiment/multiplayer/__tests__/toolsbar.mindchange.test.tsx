import React from 'react';
import { render, screen } from '@testing-library/react';
import { ToolsBar } from '../../multiplayer/ToolsBar';

describe('ToolsBar mindchange wording', () => {
  const noop = () => {};

  const baseProps = {
    connectMode: false,
    setConnectMode: noop as any,
    setConnectAnchorId: noop as any,
    canUndo: false,
    canRedo: false,
    undo: noop,
    redo: noop,
    connectAnchorId: null,
    readOnly: false,
    grabMode: false,
    setGrabMode: noop as any,
    selectMode: true,
  } as const;

  it('shows the updated phrase for negation selection stage', () => {
    render(
      <ToolsBar
        {...baseProps}
        mindchangeMode={true}
        onMindchangeDone={noop}
        mindchangeNextDir={null}
        mindchangeEdgeType={'negation'}
      />
    );
    expect(screen.getByText(/that would change your mind if it were true\./i)).toBeInTheDocument();
  });

  it('shows mitigation wording for objection selection stage', () => {
    render(
      <ToolsBar
        {...baseProps}
        mindchangeMode={true}
        onMindchangeDone={noop}
        mindchangeNextDir={null}
        mindchangeEdgeType={'objection'}
      />
    );
    expect(screen.getByText(/mitigation point/i)).toBeInTheDocument();
    expect(screen.getByText(/that would change your mind if it were true\./i)).toBeInTheDocument();
  });
});

