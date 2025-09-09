import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { useHoverTracking } from '../useHoverTracking';
import { GraphProvider } from '../../GraphContext';

const TestComp: React.FC<{ id: string; onHoverChange?: (v: boolean) => void }> = ({ id, onHoverChange }) => {
  const { hovered, onEnter, onLeave } = useHoverTracking(id);
  React.useEffect(() => { onHoverChange?.(hovered); }, [hovered, onHoverChange]);
  return <div data-testid="box" onMouseEnter={onEnter} onMouseLeave={onLeave} />;
};

jest.useFakeTimers();

describe('useHoverTracking', () => {
  it('debounces setting hovered node id', () => {
    const setHoveredNodeId = jest.fn();
    const { getByTestId } = render(
      <GraphProvider value={{ setHoveredNodeId, hoveredNodeId: null } as any}>
        <TestComp id="n1" />
      </GraphProvider>
    );
    const el = getByTestId('box');
    fireEvent.mouseEnter(el);
    expect(setHoveredNodeId).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(15); });
    expect(setHoveredNodeId).toHaveBeenCalledWith('n1');
  });

  it('releases hover after hold delay', () => {
    const setHoveredNodeId = jest.fn();
    const onHoverChange = jest.fn();
    const { getByTestId } = render(
      <GraphProvider value={{ setHoveredNodeId, hoveredNodeId: 'n1' } as any}>
        <TestComp id="n1" onHoverChange={onHoverChange} />
      </GraphProvider>
    );
    const el = getByTestId('box');
    fireEvent.mouseEnter(el);
    act(() => { jest.advanceTimersByTime(20); });
    fireEvent.mouseLeave(el);
    expect(onHoverChange).not.toHaveBeenLastCalledWith(false);
    act(() => { jest.advanceTimersByTime(120); });
    expect(onHoverChange).toHaveBeenLastCalledWith(false);
  });
});
