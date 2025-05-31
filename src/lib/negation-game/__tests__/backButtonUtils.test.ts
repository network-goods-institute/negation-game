import {
  handleBackNavigation,
  getBackButtonHandler,
  isSameDomain,
  getSpaceFromUrl,
} from "@/lib/negation-game/backButtonUtils";

describe("backButtonUtils", () => {
  describe("isSameDomain", () => {
    let originalLocation: Location;

    beforeEach(() => {
      originalLocation = window.location;
      const mockLocation = {
        ...window.location,
        hostname: "example.com",
      };
      // @ts-ignore
      delete window.location;
      // @ts-ignore
      window.location = mockLocation;
    });

    afterEach(() => {
      if (window.location !== originalLocation) {
        // @ts-ignore
        window.location = originalLocation;
      }
    });

    test("returns true for same domain referrer", () => {
      expect(isSameDomain("https://example.com/page")).toBe(true);
      expect(isSameDomain("http://example.com/page?query=test")).toBe(true);
      expect(isSameDomain("https://example.com")).toBe(true);
    });

    test("returns true for localhost referrer", () => {
      expect(isSameDomain("http://localhost:3000/page")).toBe(true);
      expect(isSameDomain("http://localhost/page")).toBe(true);
    });

    test("returns false for external domain referrer", () => {
      expect(isSameDomain("https://external-site.com/page")).toBe(false);
      expect(isSameDomain("http://different-domain.org")).toBe(false);
    });

    test("returns false for empty referrer", () => {
      expect(isSameDomain("")).toBe(false);
    });

    test("returns false for invalid URL", () => {
      expect(isSameDomain("not-a-url")).toBe(false);
    });
  });

  describe("getSpaceFromUrl", () => {
    let originalLocation: Location;

    beforeEach(() => {
      originalLocation = window.location;
    });

    afterEach(() => {
      if (window.location !== originalLocation) {
        // @ts-ignore
        window.location = originalLocation;
      }
    });

    test("returns space name from URL path", () => {
      const mockLocation = {
        ...window.location,
        pathname: "/s/test-space/some/page",
      };
      // @ts-ignore
      delete window.location;
      // @ts-ignore
      window.location = mockLocation;

      expect(getSpaceFromUrl()).toBe("test-space");
    });

    test("returns null when no space in the URL", () => {
      const mockLocation = {
        ...window.location,
        pathname: "/some/other/page",
      };
      // @ts-ignore
      delete window.location;
      // @ts-ignore
      window.location = mockLocation;

      expect(getSpaceFromUrl()).toBeNull();
    });

    test("returns null for invalid space values", () => {
      const mockLocation = {
        ...window.location,
        pathname: "/s/null/page",
      };
      // @ts-ignore
      delete window.location;
      // @ts-ignore
      window.location = mockLocation;

      expect(getSpaceFromUrl()).toBeNull();
    });
  });

  describe("handleBackNavigation", () => {
    let mockRouter: any;
    let mockSetInitialTab: jest.Mock;
    let originalHistoryBack: () => void;
    let originalHistoryLength: number;
    let originalReferrer: string;
    let originalLocation: Location;

    beforeEach(() => {
      mockRouter = {
        back: jest.fn(),
        push: jest.fn(),
      };

      mockSetInitialTab = jest.fn();

      originalHistoryBack = window.history.back;
      originalHistoryLength = window.history.length;
      originalLocation = window.location;

      Object.defineProperty(document, "referrer", {
        configurable: true,
        get: jest.fn(() => ""),
      });
      originalReferrer = document.referrer;
    });

    afterEach(() => {
      window.history.back = originalHistoryBack;
      Object.defineProperty(window.history, "length", {
        configurable: true,
        value: originalHistoryLength,
      });

      Object.defineProperty(document, "referrer", {
        configurable: true,
        get: () => originalReferrer,
      });

      if (window.location !== originalLocation) {
        // @ts-ignore
        window.location = originalLocation;
      }

      jest.clearAllMocks();
    });

    test("should set rationales tab and navigate to space from rationale page", () => {
      const mockLocation = {
        ...window.location,
        hostname: "example.com",
        pathname: "/s/test-space/rationale/123",
      };
      // @ts-ignore
      delete window.location;
      // @ts-ignore
      window.location = mockLocation;

      window.history.back = jest.fn();

      handleBackNavigation(mockRouter, mockSetInitialTab);

      expect(mockSetInitialTab).toHaveBeenCalledWith("rationales");
      expect(mockRouter.push).toHaveBeenCalledWith("/s/test-space");
      expect(window.history.back).not.toHaveBeenCalled();
      expect(mockRouter.back).not.toHaveBeenCalled();
    });

    test("should set points tab and navigate to space from point page", () => {
      const mockLocation = {
        ...window.location,
        hostname: "example.com",
        pathname: "/s/test-space/abc123",
      };
      // @ts-ignore
      delete window.location;
      // @ts-ignore
      window.location = mockLocation;

      window.history.back = jest.fn();

      handleBackNavigation(mockRouter, mockSetInitialTab);

      expect(mockSetInitialTab).toHaveBeenCalledWith("points");
      expect(mockRouter.push).toHaveBeenCalledWith("/s/test-space");
      expect(window.history.back).not.toHaveBeenCalled();
      expect(mockRouter.back).not.toHaveBeenCalled();
    });

    test("should use window.history.back() when history exists and no specific route matched", () => {
      window.history.back = jest.fn();
      Object.defineProperty(window.history, "length", {
        configurable: true,
        value: 2,
      });

      const mockLocation = {
        ...window.location,
        hostname: "example.com",
        pathname: "/some/path",
      };
      // @ts-ignore
      delete window.location;
      // @ts-ignore
      window.location = mockLocation;

      handleBackNavigation(mockRouter, mockSetInitialTab);

      expect(mockSetInitialTab).toHaveBeenCalledWith(null);
      expect(window.history.back).toHaveBeenCalled();
      expect(mockRouter.back).not.toHaveBeenCalled();
      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    test("should use router.back() when history is empty but referrer is from same domain", () => {
      Object.defineProperty(window.history, "length", {
        configurable: true,
        value: 1,
      });
      window.history.back = jest.fn();

      Object.defineProperty(document, "referrer", {
        configurable: true,
        get: () => "https://example.com/some-page",
      });

      const mockLocation = {
        ...window.location,
        hostname: "example.com",
        pathname: "/some/path",
      };
      // @ts-ignore
      delete window.location;
      // @ts-ignore
      window.location = mockLocation;

      handleBackNavigation(mockRouter, mockSetInitialTab);

      expect(mockSetInitialTab).toHaveBeenCalledWith(null);
      expect(mockRouter.back).toHaveBeenCalled();
      expect(window.history.back).not.toHaveBeenCalled();
      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    test("should use router.push() when history is empty and referrer is external", () => {
      Object.defineProperty(window.history, "length", {
        configurable: true,
        value: 1,
      });
      window.history.back = jest.fn();

      Object.defineProperty(document, "referrer", {
        configurable: true,
        get: () => "https://external-site.com",
      });

      const mockLocation = {
        ...window.location,
        hostname: "example.com",
        pathname: "/some/path",
      };
      // @ts-ignore
      delete window.location;
      // @ts-ignore
      window.location = mockLocation;

      handleBackNavigation(mockRouter, mockSetInitialTab);

      expect(mockSetInitialTab).toHaveBeenCalledWith(null);
      expect(mockRouter.push).toHaveBeenCalledWith("/");
      expect(window.history.back).not.toHaveBeenCalled();
      expect(mockRouter.back).not.toHaveBeenCalled();
    });

    test("should use router.push() with custom home path when specified", () => {
      Object.defineProperty(window.history, "length", {
        configurable: true,
        value: 1,
      });
      window.history.back = jest.fn();

      Object.defineProperty(document, "referrer", {
        configurable: true,
        get: () => "",
      });

      const mockLocation = {
        ...window.location,
        hostname: "example.com",
        pathname: "/some/path",
      };
      // @ts-ignore
      delete window.location;
      // @ts-ignore
      window.location = mockLocation;

      handleBackNavigation(mockRouter, mockSetInitialTab, "/custom-home");

      expect(mockSetInitialTab).toHaveBeenCalledWith(null);
      expect(mockRouter.push).toHaveBeenCalledWith("/custom-home");
    });
  });

  describe("getBackButtonHandler", () => {
    let mockRouter: any;
    let mockSetInitialTab: jest.Mock;

    beforeEach(() => {
      mockRouter = {
        back: jest.fn(),
        push: jest.fn(),
      };
      mockSetInitialTab = jest.fn();
      jest.spyOn(window.history, "back").mockImplementation(jest.fn());
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test("should return a function that calls handleBackNavigation", () => {
      window.history.back = jest.fn();
      Object.defineProperty(window.history, "length", {
        configurable: true,
        value: 2,
      });

      const mockLocation = {
        ...window.location,
        hostname: "example.com",
        pathname: "/some/path",
      };
      // @ts-ignore
      delete window.location;
      // @ts-ignore
      window.location = mockLocation;

      const handler = getBackButtonHandler(mockRouter, mockSetInitialTab);

      expect(typeof handler).toBe("function");
      handler();
      expect(window.history.back).toHaveBeenCalled();
    });

    test("should pass custom home path to handleBackNavigation", () => {
      Object.defineProperty(window.history, "length", {
        configurable: true,
        value: 1,
      });

      Object.defineProperty(document, "referrer", {
        configurable: true,
        get: () => "",
      });

      const mockLocation = {
        ...window.location,
        hostname: "example.com",
        pathname: "/some/path",
      };
      // @ts-ignore
      delete window.location;
      // @ts-ignore
      window.location = mockLocation;

      const handler = getBackButtonHandler(
        mockRouter,
        mockSetInitialTab,
        "/custom-home"
      );

      handler();
      expect(mockRouter.push).toHaveBeenCalledWith("/custom-home");
    });
  });
});
