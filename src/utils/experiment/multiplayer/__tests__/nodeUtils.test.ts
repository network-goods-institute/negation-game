import { getNodeDimensionsAndCenter } from '../nodeUtils';

describe('nodeUtils', () => {
  describe('getNodeDimensionsAndCenter', () => {
    it('should extract dimensions and calculate center from node with all properties', () => {
      const node = {
        width: 200,
        height: 100,
        position: { x: 50, y: 75 },
      };

      const result = getNodeDimensionsAndCenter(node);

      expect(result.width).toBe(200);
      expect(result.height).toBe(100);
      expect(result.x).toBe(50);
      expect(result.y).toBe(75);
      expect(result.centerX).toBe(150); // 50 + 200/2
      expect(result.centerY).toBe(125); // 75 + 100/2
    });

    it('should use measured dimensions if width/height not available', () => {
      const node = {
        measured: { width: 180, height: 90 },
        position: { x: 0, y: 0 },
      };

      const result = getNodeDimensionsAndCenter(node);

      expect(result.width).toBe(180);
      expect(result.height).toBe(90);
      expect(result.centerX).toBe(90);
      expect(result.centerY).toBe(45);
    });

    it('should use style dimensions if width/height and measured not available', () => {
      const node = {
        style: { width: 160, height: 80 },
        position: { x: 10, y: 20 },
      };

      const result = getNodeDimensionsAndCenter(node);

      expect(result.width).toBe(160);
      expect(result.height).toBe(80);
      expect(result.centerX).toBe(90); // 10 + 160/2
      expect(result.centerY).toBe(60); // 20 + 80/2
    });

    it('should use default dimensions (120x60) if all dimension sources missing', () => {
      const node = {
        position: { x: 0, y: 0 },
      };

      const result = getNodeDimensionsAndCenter(node);

      expect(result.width).toBe(120);
      expect(result.height).toBe(60);
      expect(result.centerX).toBe(60);
      expect(result.centerY).toBe(30);
    });

    it('should handle missing position', () => {
      const node = {
        width: 100,
        height: 50,
      };

      const result = getNodeDimensionsAndCenter(node);

      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.centerX).toBe(50);
      expect(result.centerY).toBe(25);
    });

    it('should prioritize width over measured.width over style.width', () => {
      const node = {
        width: 200,
        measured: { width: 150 },
        style: { width: 100 },
        height: 60,
        position: { x: 0, y: 0 },
      };

      const result = getNodeDimensionsAndCenter(node);

      expect(result.width).toBe(200);
    });

    it('should handle string dimension values by converting to number', () => {
      const node = {
        width: '200',
        height: '100',
        position: { x: '50', y: '75' },
      };

      const result = getNodeDimensionsAndCenter(node);

      expect(result.width).toBe(200);
      expect(result.height).toBe(100);
      expect(result.x).toBe(50);
      expect(result.y).toBe(75);
    });

    it('should handle NaN or invalid values by using defaults', () => {
      const node = {
        width: NaN,
        height: null,
        position: { x: 0, y: 0 },
      };

      const result = getNodeDimensionsAndCenter(node);

      expect(result.width).toBe(120);
      expect(result.height).toBe(60);
    });

    it('should handle zero dimensions by using defaults', () => {
      const node = {
        width: 0,
        height: 0,
        position: { x: 10, y: 20 },
      };

      const result = getNodeDimensionsAndCenter(node);

      expect(result.width).toBe(120);
      expect(result.height).toBe(60);
    });

    it('should handle negative dimensions by using defaults', () => {
      const node = {
        width: -100,
        height: -50,
        position: { x: 0, y: 0 },
      };

      const result = getNodeDimensionsAndCenter(node);

      expect(result.width).toBe(120);
      expect(result.height).toBe(60);
    });

    it('should handle null node gracefully', () => {
      const result = getNodeDimensionsAndCenter(null);

      expect(result.width).toBe(120);
      expect(result.height).toBe(60);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.centerX).toBe(60);
      expect(result.centerY).toBe(30);
    });

    it('should handle undefined node gracefully', () => {
      const result = getNodeDimensionsAndCenter(undefined);

      expect(result.width).toBe(120);
      expect(result.height).toBe(60);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it('should calculate correct center for large nodes', () => {
      const node = {
        width: 500,
        height: 300,
        position: { x: 100, y: 200 },
      };

      const result = getNodeDimensionsAndCenter(node);

      expect(result.centerX).toBe(350); // 100 + 500/2
      expect(result.centerY).toBe(350); // 200 + 300/2
    });
  });
});
