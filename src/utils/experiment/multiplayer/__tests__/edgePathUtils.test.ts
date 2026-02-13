import { getTrimmedLineCoords, computeMidpointBetweenBorders, getParallelEdgeOffset, getNodeAttachmentPoint } from '../edgePathUtils';

describe('edgePathUtils', () => {
  describe('getTrimmedLineCoords', () => {
    const sourceNode = {
      position: { x: 0, y: 0 },
      width: 100,
      height: 100,
    };

    const targetNode = {
      position: { x: 200, y: 200 },
      width: 100,
      height: 100,
    };

    it('returns basic coordinates when nodes have no dimensions', () => {
      const result = getTrimmedLineCoords(0, 0, 200, 200, 0, 0, {}, {});
      expect(result).toEqual({
        fromX: 0,
        fromY: 0,
        toX: 200,
        toY: 200,
      });
    });

    it('trims line to avoid source and target nodes', () => {
      const result = getTrimmedLineCoords(50, 50, 250, 250, 0, 0, sourceNode, targetNode);

      expect(result.fromX).toBeGreaterThan(50);
      expect(result.fromY).toBeGreaterThan(50);
      expect(result.toX).toBeLessThan(250);
      expect(result.toY).toBeLessThan(250);
    });

    it('applies offset to coordinates', () => {
      const result = getTrimmedLineCoords(50, 50, 250, 250, 10, 10, sourceNode, targetNode);

      const noOffsetResult = getTrimmedLineCoords(50, 50, 250, 250, 0, 0, sourceNode, targetNode);

      expect(result.fromX).not.toEqual(noOffsetResult.fromX);
      expect(result.fromY).not.toEqual(noOffsetResult.fromY);
    });

    it('handles horizontal lines', () => {
      const horizontalTarget = {
        position: { x: 200, y: 0 },
        width: 100,
        height: 100,
      };

      const result = getTrimmedLineCoords(50, 50, 250, 50, 0, 0, sourceNode, horizontalTarget);

      expect(result.fromX).toBeGreaterThan(50);
      expect(result.toX).toBeLessThan(250);
    });

    it('handles vertical lines', () => {
      const verticalTarget = {
        position: { x: 0, y: 200 },
        width: 100,
        height: 100,
      };

      const result = getTrimmedLineCoords(50, 50, 50, 250, 0, 0, sourceNode, verticalTarget);

      expect(result.fromY).toBeGreaterThan(50);
      expect(result.toY).toBeLessThan(250);
    });

    it('adds padding to prevent edge-node overlap', () => {
      const result = getTrimmedLineCoords(50, 50, 250, 250, 0, 0, sourceNode, targetNode);

      // The trimmed coordinates should have some padding from the node edges
      const distanceFromSource = Math.sqrt(
        Math.pow(result.fromX - 50, 2) + Math.pow(result.fromY - 50, 2)
      );
      expect(distanceFromSource).toBeGreaterThan(0);
    });
  });

  describe('computeMidpointBetweenBorders', () => {
    const sourceNode = {
      position: { x: 0, y: 0 },
      width: 100,
      height: 100,
    };

    const targetNode = {
      position: { x: 200, y: 200 },
      width: 100,
      height: 100,
    };

    it('returns fallback when nodes are invalid', () => {
      const [x, y] = computeMidpointBetweenBorders(null, null, 150, 150);
      expect(x).toBe(150);
      expect(y).toBe(150);
    });

    it('computes midpoint between node borders', () => {
      const [x, y] = computeMidpointBetweenBorders(sourceNode, targetNode, 0, 0);

      // Midpoint should be between the two nodes
      expect(x).toBeGreaterThan(50);
      expect(x).toBeLessThan(250);
      expect(y).toBeGreaterThan(50);
      expect(y).toBeLessThan(250);
    });

    it('handles nodes with same position', () => {
      const samePositionTarget = {
        position: { x: 0, y: 0 },
        width: 100,
        height: 100,
      };

      const [x, y] = computeMidpointBetweenBorders(sourceNode, samePositionTarget, 150, 150);

      expect(x).toBe(150);
      expect(y).toBe(150);
    });

    it('handles nodes without dimensions', () => {
      const noDimensionsNode = {
        position: { x: 0, y: 0 },
      };

      const [x, y] = computeMidpointBetweenBorders(noDimensionsNode, noDimensionsNode, 100, 100);

      expect(x).toBe(100);
      expect(y).toBe(100);
    });

    it('computes correct midpoint for horizontally aligned nodes', () => {
      const horizontalTarget = {
        position: { x: 200, y: 0 },
        width: 100,
        height: 100,
      };

      const [x, y] = computeMidpointBetweenBorders(sourceNode, horizontalTarget, 0, 0);

      expect(Math.abs(y - 50)).toBeLessThan(10); // Y should be close to center
      expect(x).toBeGreaterThan(50);
      expect(x).toBeLessThan(250);
    });

    it('computes correct midpoint for vertically aligned nodes', () => {
      const verticalTarget = {
        position: { x: 0, y: 200 },
        width: 100,
        height: 100,
      };

      const [x, y] = computeMidpointBetweenBorders(sourceNode, verticalTarget, 0, 0);

      expect(Math.abs(x - 50)).toBeLessThan(10); // X should be close to center
      expect(y).toBeGreaterThan(50);
      expect(y).toBeLessThan(250);
    });
  });

  describe('getNodeAttachmentPoint', () => {
    it('spreads attachment points for edges on the same side', () => {
      const nodes = new Map([
        ['a', { id: 'a', position: { x: 0, y: 0 }, width: 100, height: 100 }],
        ['b', { id: 'b', position: { x: 200, y: 0 }, width: 100, height: 100 }],
        ['c', { id: 'c', position: { x: 200, y: 50 }, width: 100, height: 100 }],
        ['d', { id: 'd', position: { x: 200, y: 100 }, width: 100, height: 100 }],
      ]);

      const getNode = (id: string) => nodes.get(id);
      const edges = [
        { id: 'a-edge', source: 'a', target: 'b' },
        { id: 'b-edge', source: 'a', target: 'c' },
        { id: 'c-edge', source: 'a', target: 'd' },
      ];

      const first = getNodeAttachmentPoint('a', 'b', 'a-edge', edges, getNode, { spacing: 10 });
      const second = getNodeAttachmentPoint('a', 'c', 'b-edge', edges, getNode, { spacing: 10 });
      const third = getNodeAttachmentPoint('a', 'd', 'c-edge', edges, getNode, { spacing: 10 });

      if (!first || !second || !third) {
        throw new Error('Missing attachment point');
      }
      expect(first.x).toBeCloseTo(50, 3);
      expect(first.y).toBeCloseTo(40, 3);
      expect(second.x).toBeCloseTo(50, 3);
      expect(second.y).toBeCloseTo(50, 3);
      expect(third.x).toBeCloseTo(45.528, 3);
      expect(third.y).toBeCloseTo(58.944, 3);
    });

    it('returns null when only one edge is connected', () => {
      const nodes = new Map([
        ['a', { id: 'a', position: { x: 0, y: 0 }, width: 100, height: 100 }],
        ['b', { id: 'b', position: { x: 200, y: 0 }, width: 100, height: 100 }],
      ]);
      const getNode = (id: string) => nodes.get(id);
      const edges = [{ id: 'solo-edge', source: 'a', target: 'b' }];

      const point = getNodeAttachmentPoint('a', 'b', 'solo-edge', edges, getNode, { spacing: 10 });

      expect(point).toBeNull();
    });

    it('spaces attachments for edge anchors', () => {
      const nodes = new Map([
        ['anchor:1', { id: 'anchor:1', type: 'edge_anchor', position: { x: 100, y: 100 } }],
        ['b', { id: 'b', position: { x: 200, y: 100 }, width: 100, height: 100 }],
        ['c', { id: 'c', position: { x: 100, y: 200 }, width: 100, height: 100 }],
        ['d', { id: 'd', position: { x: 0, y: 100 }, width: 100, height: 100 }],
      ]);
      const getNode = (id: string) => nodes.get(id);
      const edges = [
        { id: 'edge-1', source: 'b', target: 'anchor:1' },
        { id: 'edge-2', source: 'c', target: 'anchor:1' },
        { id: 'edge-3', source: 'd', target: 'anchor:1' },
      ];

      const p1 = getNodeAttachmentPoint('anchor:1', 'b', 'edge-1', edges, getNode, { spacing: 10 });
      const p2 = getNodeAttachmentPoint('anchor:1', 'c', 'edge-2', edges, getNode, { spacing: 10 });
      const p3 = getNodeAttachmentPoint('anchor:1', 'd', 'edge-3', edges, getNode, { spacing: 10 });

      if (!p1 || !p2 || !p3) {
        throw new Error('Missing attachment point');
      }
      expect(Math.abs(p1.x - 100)).toBeLessThanOrEqual(8);
      expect(Math.abs(p1.y - 100)).toBeLessThanOrEqual(8);
      expect(Math.abs(p2.x - 100)).toBeLessThanOrEqual(8);
      expect(Math.abs(p2.y - 100)).toBeLessThanOrEqual(8);
      expect(Math.abs(p3.x - 100)).toBeLessThanOrEqual(8);
      expect(Math.abs(p3.y - 100)).toBeLessThanOrEqual(8);
      expect(p1.x === p2.x && p1.y === p2.y).toBe(false);
      expect(p2.x === p3.x && p2.y === p3.y).toBe(false);
    });
  });

  describe('getParallelEdgeOffset', () => {
    it('returns zero offset for a single edge', () => {
      const edges = [{ id: 'a', source: '1', target: '2' }];
      const result = getParallelEdgeOffset('a', '1', '2', edges, { spacing: 10, includeReverse: true });
      expect(result.offset).toBe(0);
      expect(result.count).toBe(1);
    });

    it('spreads offsets across parallel edges', () => {
      const edges = [
        { id: 'a', source: '1', target: '2' },
        { id: 'b', source: '1', target: '2' },
      ];
      const resultA = getParallelEdgeOffset('a', '1', '2', edges, { spacing: 10, includeReverse: true });
      const resultB = getParallelEdgeOffset('b', '1', '2', edges, { spacing: 10, includeReverse: true });
      expect(resultA.offset).toBe(-5);
      expect(resultB.offset).toBe(5);
    });

    it('includes reverse edges when enabled', () => {
      const edges = [
        { id: 'a', source: '1', target: '2' },
        { id: 'b', source: '2', target: '1' },
      ];
      const result = getParallelEdgeOffset('a', '1', '2', edges, { spacing: 8, includeReverse: true });
      expect(result.count).toBe(2);
      expect(result.offset).toBe(-4);
    });
  });
});
