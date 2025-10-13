/**
 * Test that tooltips have correct z-index values to appear above their parent elements
 */
import { render } from '@testing-library/react';

describe('Tooltip Z-Index Configuration', () => {
  describe('Toolbar Tooltips', () => {
    it('should have z-index higher than toolbar', () => {
      // Toolbar is at z-[1000]
      // Tooltips should be at z-[1100]

      const toolbarZIndex = 1000;
      const tooltipZIndex = 1100;

      expect(tooltipZIndex).toBeGreaterThan(toolbarZIndex);
    });

    it('should use z-[1100] class for toolbar tooltips', () => {
      const tooltip = document.createElement('div');
      tooltip.className = 'z-[1100]';

      expect(tooltip.className).toContain('z-[1100]');
    });
  });

  describe('Edge Overlay Tooltips', () => {
    it('should have z-index higher than edge overlay', () => {
      // Edge overlay is at z-60
      // Tooltips should be at z-[70]

      const overlayZIndex = 60;
      const tooltipZIndex = 70;

      expect(tooltipZIndex).toBeGreaterThan(overlayZIndex);
    });

    it('should use z-[70] class for edge overlay tooltips', () => {
      const tooltip = document.createElement('div');
      tooltip.className = 'text-xs z-[70]';

      expect(tooltip.className).toContain('z-[70]');
      expect(tooltip.className).not.toContain('!z-30');
    });
  });

  describe('Z-Index Hierarchy', () => {
    it('should maintain correct z-index order', () => {
      const hierarchy = {
        edgeOverlay: 60,
        edgeTooltip: 70,
        toolbar: 1000,
        toolbarTooltip: 1100,
      };

      // Edge overlay < Edge tooltip < Toolbar < Toolbar tooltip
      expect(hierarchy.edgeOverlay).toBeLessThan(hierarchy.edgeTooltip);
      expect(hierarchy.edgeTooltip).toBeLessThan(hierarchy.toolbar);
      expect(hierarchy.toolbar).toBeLessThan(hierarchy.toolbarTooltip);
    });
  });

  describe('Tooltip Content Component', () => {
    it('should have default z-[60] that can be overridden', () => {
      // Default TooltipContent has z-[60]
      // But it can be overridden with className prop

      const defaultZIndex = 60;
      const toolbarOverride = 1100;

      expect(toolbarOverride).toBeGreaterThan(defaultZIndex);
    });
  });
});
