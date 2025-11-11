import {
  computeSide,
  handleZoomChange,
  handleClickText,
  handleClickPrice,
  handleClickAuto,
  isLocked,
  getLockMode,
  MarketOverlayState
} from "@/atoms/marketOverlayAtom";

describe("market overlay state machine", () => {
  describe("computeSide", () => {
    it("returns TEXT for AUTO_TEXT and LOCK_TEXT states", () => {
      expect(computeSide("AUTO_TEXT")).toBe("TEXT");
      expect(computeSide("LOCK_TEXT")).toBe("TEXT");
    });

    it("returns PRICE for AUTO_PRICE and LOCK_PRICE states", () => {
      expect(computeSide("AUTO_PRICE")).toBe("PRICE");
      expect(computeSide("LOCK_PRICE")).toBe("PRICE");
    });
  });

  describe("isLocked", () => {
    it("returns true for locked states", () => {
      expect(isLocked("LOCK_TEXT")).toBe(true);
      expect(isLocked("LOCK_PRICE")).toBe(true);
    });

    it("returns false for auto states", () => {
      expect(isLocked("AUTO_TEXT")).toBe(false);
      expect(isLocked("AUTO_PRICE")).toBe(false);
    });
  });

  describe("getLockMode", () => {
    it("returns the lock mode for locked states", () => {
      expect(getLockMode("LOCK_TEXT")).toBe("TEXT");
      expect(getLockMode("LOCK_PRICE")).toBe("PRICE");
    });

    it("returns null for auto states", () => {
      expect(getLockMode("AUTO_TEXT")).toBe(null);
      expect(getLockMode("AUTO_PRICE")).toBe(null);
    });
  });

  describe("handleZoomChange", () => {
    const threshold = 0.6;

    it("transitions AUTO_TEXT to AUTO_PRICE when zooming out", () => {
      expect(handleZoomChange("AUTO_TEXT", 0.5, threshold)).toBe("AUTO_PRICE");
    });

    it("transitions AUTO_PRICE to AUTO_TEXT when zooming in", () => {
      expect(handleZoomChange("AUTO_PRICE", 0.7, threshold)).toBe("AUTO_TEXT");
    });

    it("does not change locked states on zoom", () => {
      expect(handleZoomChange("LOCK_TEXT", 0.5, threshold)).toBe("LOCK_TEXT");
      expect(handleZoomChange("LOCK_TEXT", 0.7, threshold)).toBe("LOCK_TEXT");
      expect(handleZoomChange("LOCK_PRICE", 0.5, threshold)).toBe("LOCK_PRICE");
      expect(handleZoomChange("LOCK_PRICE", 0.7, threshold)).toBe("LOCK_PRICE");
    });

    it("stays in the same state when zoom doesn't cross threshold", () => {
      expect(handleZoomChange("AUTO_TEXT", 0.7, threshold)).toBe("AUTO_TEXT");
      expect(handleZoomChange("AUTO_PRICE", 0.5, threshold)).toBe("AUTO_PRICE");
    });
  });

  describe("handleClickText", () => {
    it("transitions any state to LOCK_TEXT", () => {
      expect(handleClickText("AUTO_TEXT")).toBe("LOCK_TEXT");
      expect(handleClickText("AUTO_PRICE")).toBe("LOCK_TEXT");
      expect(handleClickText("LOCK_TEXT")).toBe("LOCK_TEXT");
      expect(handleClickText("LOCK_PRICE")).toBe("LOCK_TEXT");
    });
  });

  describe("handleClickPrice", () => {
    it("transitions any state to LOCK_PRICE", () => {
      expect(handleClickPrice("AUTO_TEXT")).toBe("LOCK_PRICE");
      expect(handleClickPrice("AUTO_PRICE")).toBe("LOCK_PRICE");
      expect(handleClickPrice("LOCK_TEXT")).toBe("LOCK_PRICE");
      expect(handleClickPrice("LOCK_PRICE")).toBe("LOCK_PRICE");
    });
  });

  describe("handleClickAuto", () => {
    const threshold = 0.6;

    it("returns AUTO_TEXT when zoomed in", () => {
      expect(handleClickAuto("LOCK_TEXT", 0.7, threshold)).toBe("AUTO_TEXT");
      expect(handleClickAuto("LOCK_PRICE", 0.7, threshold)).toBe("AUTO_TEXT");
    });

    it("returns AUTO_PRICE when zoomed out", () => {
      expect(handleClickAuto("LOCK_TEXT", 0.5, threshold)).toBe("AUTO_PRICE");
      expect(handleClickAuto("LOCK_PRICE", 0.5, threshold)).toBe("AUTO_PRICE");
    });

    it("handles auto states by returning appropriate state based on zoom", () => {
      expect(handleClickAuto("AUTO_TEXT", 0.7, threshold)).toBe("AUTO_TEXT");
      expect(handleClickAuto("AUTO_PRICE", 0.5, threshold)).toBe("AUTO_PRICE");
    });
  });
});

