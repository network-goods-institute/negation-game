import { renderHook } from '@testing-library/react';
import { useNodeHelpers } from '../useNodeHelpers';

describe('useNodeHelpers', () => {
  describe('getNodeCenter', () => {
    it('returns null when node not found', () => {
      const { result } = renderHook(() => useNodeHelpers({ nodes: [], edges: [] }));

      const center = result.current.getNodeCenter('non-existent');

      expect(center).toBeNull();
    });

    it('calculates center from position and width/height', () => {
      const nodes = [
        {
          id: 'node-1',
          position: { x: 100, y: 200 },
          width: 50,
          height: 30,
          data: {},
        },
      ];
      const { result } = renderHook(() => useNodeHelpers({ nodes, edges: [] }));

      const center = result.current.getNodeCenter('node-1');

      expect(center).toEqual({ x: 125, y: 215 }); // 100 + 50/2, 200 + 30/2
    });

    it('uses measured width/height when node width/height not available', () => {
      const nodes = [
        {
          id: 'node-1',
          position: { x: 100, y: 200 },
          measured: { width: 60, height: 40 },
          data: {},
        },
      ];
      const { result } = renderHook(() => useNodeHelpers({ nodes, edges: [] }));

      const center = result.current.getNodeCenter('node-1');

      expect(center).toEqual({ x: 130, y: 220 });
    });

    it('uses style width/height when measured not available', () => {
      const nodes = [
        {
          id: 'node-1',
          position: { x: 100, y: 200 },
          style: { width: 70, height: 50 },
          data: {},
        },
      ];
      const { result } = renderHook(() => useNodeHelpers({ nodes, edges: [] }));

      const center = result.current.getNodeCenter('node-1');

      expect(center).toEqual({ x: 135, y: 225 });
    });

    it('uses positionAbsolute when available', () => {
      const nodes = [
        {
          id: 'node-1',
          position: { x: 100, y: 200 },
          positionAbsolute: { x: 150, y: 250 },
          width: 50,
          height: 30,
          data: {},
        },
      ];
      const { result } = renderHook(() => useNodeHelpers({ nodes, edges: [] }));

      const center = result.current.getNodeCenter('node-1');

      expect(center).toEqual({ x: 175, y: 265 }); // Uses positionAbsolute
    });

    it('defaults to 0 dimensions when none available', () => {
      const nodes = [
        {
          id: 'node-1',
          position: { x: 100, y: 200 },
          data: {},
        },
      ];
      const { result } = renderHook(() => useNodeHelpers({ nodes, edges: [] }));

      const center = result.current.getNodeCenter('node-1');

      expect(center).toEqual({ x: 100, y: 200 });
    });
  });

  describe('getEdgeMidpoint', () => {
    it('returns null when edge not found', () => {
      const { result } = renderHook(() => useNodeHelpers({ nodes: [], edges: [] }));

      const midpoint = result.current.getEdgeMidpoint('non-existent');

      expect(midpoint).toBeNull();
    });

    it('returns null when source node not found', () => {
      const edges = [{ id: 'edge-1', source: 'node-1', target: 'node-2' }];
      const nodes = [{ id: 'node-2', position: { x: 200, y: 300 }, width: 50, height: 30, data: {} }];
      const { result } = renderHook(() => useNodeHelpers({ nodes, edges }));

      const midpoint = result.current.getEdgeMidpoint('edge-1');

      expect(midpoint).toBeNull();
    });

    it('returns null when target node not found', () => {
      const edges = [{ id: 'edge-1', source: 'node-1', target: 'node-2' }];
      const nodes = [{ id: 'node-1', position: { x: 100, y: 200 }, width: 50, height: 30, data: {} }];
      const { result } = renderHook(() => useNodeHelpers({ nodes, edges }));

      const midpoint = result.current.getEdgeMidpoint('edge-1');

      expect(midpoint).toBeNull();
    });

    it('calculates midpoint between source and target centers', () => {
      const edges = [{ id: 'edge-1', source: 'node-1', target: 'node-2' }];
      const nodes = [
        { id: 'node-1', position: { x: 100, y: 200 }, width: 50, height: 30, data: {} },
        { id: 'node-2', position: { x: 300, y: 400 }, width: 50, height: 30, data: {} },
      ];
      const { result } = renderHook(() => useNodeHelpers({ nodes, edges }));

      const midpoint = result.current.getEdgeMidpoint('edge-1');

      // node-1 center: (125, 215), node-2 center: (325, 415)
      // midpoint: ((125+325)/2, (215+415)/2) = (225, 315)
      expect(midpoint).toEqual({ x: 225, y: 315 });
    });
  });
});
