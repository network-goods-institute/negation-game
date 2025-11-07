import React from 'react';
import { render } from '@testing-library/react';
import { EdgeSelectionHighlight } from '../EdgeSelectionHighlight';
import { getBezierPath, Position } from '@xyflow/react';

describe('EdgeSelectionHighlight path alignment', () => {
  const baseNodes = {
    sourceNode: { position: { y: 0 } },
    targetNode: { position: { y: 100 } },
  } as any;

  it('renders objection bezier path matching MainEdgeRenderer orientation (normal mode)', () => {
    const curvature = 0.35;
    const sourceX = 0, sourceY = 0, targetX = 100, targetY = 100;
    const [expectedD] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition: Position.Bottom,
      targetX,
      targetY,
      targetPosition: Position.Top,
      curvature,
    });

    const { container } = render(
      <svg>
        <EdgeSelectionHighlight
          selected
          shouldRenderOverlay
          mindchangeRenderMode="normal"
          useBezier
          curvature={curvature}
          edgeId="e-1"
          sourceX={sourceX}
          sourceY={sourceY}
          targetX={targetX}
          targetY={targetY}
          sourceNode={baseNodes.sourceNode}
          targetNode={baseNodes.targetNode}
          edgeType="objection"
          overlayStrokeWidth={14}
        />
      </svg>
    );

    const path = container.querySelector('path');
    expect(path).toBeTruthy();
    expect(path!.getAttribute('d')).toBe(expectedD);
    expect(path!.getAttribute('stroke-width')).toBe('14');
  });

  it('renders two paths for objection bidirectional bezier highlight', () => {
    const { container } = render(
      <svg>
        <EdgeSelectionHighlight
          selected
          shouldRenderOverlay
          mindchangeRenderMode="bidirectional"
          useBezier
          curvature={0.35}
          edgeId="e-2"
          sourceX={0}
          sourceY={0}
          targetX={100}
          targetY={100}
          sourceNode={{ position: { y: 0 } } as any}
          targetNode={{ position: { y: 100 } } as any}
          edgeType="objection"
          overlayStrokeWidth={10}
        />
      </svg>
    );
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(2);
    expect(paths[0].getAttribute('stroke-width')).toBe('10');
    expect(paths[1].getAttribute('stroke-width')).toBe('10');
  });

  it('renders straight line with provided overlay width when not bezier', () => {
    const { container } = render(
      <svg>
        <EdgeSelectionHighlight
          selected
          shouldRenderOverlay
          mindchangeRenderMode="normal"
          useBezier={false}
          edgeId="e-3"
          sourceX={10}
          sourceY={20}
          targetX={30}
          targetY={40}
          sourceNode={{} as any}
          targetNode={{} as any}
          edgeType="statement"
          overlayStrokeWidth={9}
        />
      </svg>
    );
    const line = container.querySelector('line');
    expect(line).toBeTruthy();
    expect(line!.getAttribute('x1')).toBe('10');
    expect(line!.getAttribute('y1')).toBe('20');
    expect(line!.getAttribute('x2')).toBe('30');
    expect(line!.getAttribute('y2')).toBe('40');
    expect(line!.getAttribute('stroke-width')).toBe('9');
  });
});


