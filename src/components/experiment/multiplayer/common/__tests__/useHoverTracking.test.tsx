import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { useHoverTracking } from '../useHoverTracking';
import { GraphProvider } from '../../GraphContext';

const TestComp: React.FC<{ id: string; onHoverChange?: (v: boolean) => void }> = ({ id, onHoverChange }) => {
  const { hovered, onMouseEnter, onMouseLeave } = useHoverTracking(id);
  React.useEffect(() => { onHoverChange?.(hovered); }, [hovered, onHoverChange]);
  return <div data-testid="box" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />;
};

jest.useFakeTimers();

describe('useHoverTracking', () => {
  it('immediately sets hovered node id on enter', () => {
    const setHoveredNodeId = jest.fn();
    const { getByTestId } = render(
      <GraphProvider value={{ setHoveredNodeId, hoveredNodeId: null } as any}>
        <TestComp id="n1" />
      </GraphProvider>
    );
    const el = getByTestId('box');
    fireEvent.mouseEnter(el);
    expect(setHoveredNodeId).toHaveBeenCalledWith('n1');
  });

  it('clears hover on mouse leave', () => {
    const setHoveredNodeId = jest.fn();
    const onHoverChange = jest.fn();
    const { getByTestId } = render(
      <GraphProvider value={{ setHoveredNodeId, hoveredNodeId: 'n1' } as any}>
        <TestComp id="n1" onHoverChange={onHoverChange} />
      </GraphProvider>
    );
    const el = getByTestId('box');
    fireEvent.mouseEnter(el);
    fireEvent.mouseLeave(el);
    act(() => { jest.advanceTimersByTime(10); });
    expect(setHoveredNodeId).toHaveBeenCalledWith(null);
  });
});
