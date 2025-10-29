import { getTrimmedLineCoords, computeMidpointBetweenBorders } from '../edgePathUtils';

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
});
