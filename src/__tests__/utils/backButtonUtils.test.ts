import {
  handleBackNavigation,
  getBackButtonHandler,
  isSameDomain,
  getSpaceFromUrl,
} from "@/utils/backButtonUtils";

describe("backButtonUtils", () => {
  describe("isSameDomain", () => {
    let originalLocation: Location;

    beforeEach(() => {
      // Save original location
      originalLocation = window.location;

      // Create a mock location object
      const mockLocation = {
        ...window.location,
        hostname: "example.com",
      };

      // @ts-ignore - TypeScript complains about this because Location is supposed to be read-only
      delete window.location;
      // @ts-ignore
      window.location = mockLocation;
    });

    afterEach(() => {
      // Restore original location if needed
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
      // Save original location
      originalLocation = window.location;
    });

    afterEach(() => {
      // Restore original location if needed
      if (window.location !== originalLocation) {
        // @ts-ignore
        window.location = originalLocation;
      }
    });

    test("returns space name from URL path", () => {
      // Mock location with space in the URL
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
      // Mock location with no space in the URL
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
      // Mock location with invalid space value
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
    let originalHistoryBack: () => void;
    let originalHistoryLength: number;
    let originalReferrer: string;
    let originalLocation: Location;

    beforeEach(() => {
      // Setup router mock
      mockRouter = {
        back: jest.fn(),
        push: jest.fn(),
      };

      // Save original window.history methods and properties
      originalHistoryBack = window.history.back;
      originalHistoryLength = window.history.length;

      // Save original window.location
      originalLocation = window.location;

      // Setup document.referrer mock
      Object.defineProperty(document, "referrer", {
        configurable: true,
        get: jest.fn(() => ""),
      });
      originalReferrer = document.referrer;
    });

    afterEach(() => {
      // Restore original window.history
      window.history.back = originalHistoryBack;
      Object.defineProperty(window.history, "length", {
        configurable: true,
        value: originalHistoryLength,
      });

      // Restore original document.referrer
      Object.defineProperty(document, "referrer", {
        configurable: true,
        get: () => originalReferrer,
      });

      // Restore original location if needed
      if (window.location !== originalLocation) {
        // @ts-ignore
        window.location = originalLocation;
      }

      jest.clearAllMocks();
    });

    test("should use window.history.back() when history exists", () => {
      // Mock window.history.back and history.length
      window.history.back = jest.fn();
      Object.defineProperty(window.history, "length", {
        configurable: true,
        value: 2, // Simulate having history
      });

      // Create a mock location with a non-rationale path
      const mockLocation = {
        ...window.location,
        hostname: "example.com",
        pathname: "/some/path",
      };
      // @ts-ignore
      delete window.location;
      // @ts-ignore
      window.location = mockLocation;

      // Call the function
      handleBackNavigation(mockRouter);

      // Should use window.history.back()
      expect(window.history.back).toHaveBeenCalled();
      // Should not use router methods
      expect(mockRouter.back).not.toHaveBeenCalled();
      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    test("should use router.back() when history is empty but referrer is from same domain", () => {
      // Mock history to be empty
      Object.defineProperty(window.history, "length", {
        configurable: true,
        value: 1, // Simulate no history
      });
      window.history.back = jest.fn();

      // Mock document.referrer to be from same domain
      Object.defineProperty(document, "referrer", {
        configurable: true,
        get: () => "https://example.com/some-page",
      });

      // Mock checking hostname
      const mockLocation = {
        ...window.location,
        hostname: "example.com",
        pathname: "/some/path",
      };
      // @ts-ignore - overriding readonly property
      delete window.location;
      // @ts-ignore
      window.location = mockLocation;

      // Call the function
      handleBackNavigation(mockRouter);

      // Should use router.back()
      expect(mockRouter.back).toHaveBeenCalled();
      expect(window.history.back).not.toHaveBeenCalled();
      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    test("should use router.push() when history is empty and referrer is external", () => {
      // Mock history to be empty
      Object.defineProperty(window.history, "length", {
        configurable: true,
        value: 1, // Simulate no history
      });
      window.history.back = jest.fn();

      // Mock document.referrer to be from external domain
      Object.defineProperty(document, "referrer", {
        configurable: true,
        get: () => "https://external-site.com",
      });

      // Mock checking hostname
      const mockLocation = {
        ...window.location,
        hostname: "example.com",
        pathname: "/some/path",
      };
      // @ts-ignore - overriding readonly property
      delete window.location;
      // @ts-ignore
      window.location = mockLocation;

      // Call the function
      handleBackNavigation(mockRouter);

      // Should use router.push('/')
      expect(mockRouter.push).toHaveBeenCalledWith("/");
      expect(window.history.back).not.toHaveBeenCalled();
      expect(mockRouter.back).not.toHaveBeenCalled();
    });

    test("should use router.push() with custom home path when specified", () => {
      // Mock history to be empty
      Object.defineProperty(window.history, "length", {
        configurable: true,
        value: 1, // Simulate no history
      });
      window.history.back = jest.fn();

      // Mock empty referrer
      Object.defineProperty(document, "referrer", {
        configurable: true,
        get: () => "",
      });

      // Create a mock location with a non-rationale path
      const mockLocation = {
        ...window.location,
        hostname: "example.com",
        pathname: "/some/path",
      };
      // @ts-ignore
      delete window.location;
      // @ts-ignore
      window.location = mockLocation;

      // Call the function with custom home path
      handleBackNavigation(mockRouter, "/custom-home");

      // Should use router.push with custom path
      expect(mockRouter.push).toHaveBeenCalledWith("/custom-home");
    });

    test("should navigate to space page from rationale page", () => {
      // Create a mock location for a rationale page in a space
      const mockLocation = {
        ...window.location,
        hostname: "example.com",
        pathname: "/s/test-space/rationale/123",
      };
      // @ts-ignore
      delete window.location;
      // @ts-ignore
      window.location = mockLocation;

      // Mock window.history.back to verify it's not called
      window.history.back = jest.fn();

      // Call the function
      handleBackNavigation(mockRouter);

      // Should navigate to the space page
      expect(mockRouter.push).toHaveBeenCalledWith("/s/test-space");
      expect(window.history.back).not.toHaveBeenCalled();
      expect(mockRouter.back).not.toHaveBeenCalled();
    });

    test("should fall back to history when on rationale page but space not found", () => {
      // Create a mock location for a rationale page without a valid space context
      const mockLocation = {
        ...window.location,
        hostname: "example.com",
        pathname: "/rationale/123", // No space in path
      };
      // @ts-ignore
      delete window.location;
      // @ts-ignore
      window.location = mockLocation;

      // Set up history to have entries
      Object.defineProperty(window.history, "length", {
        configurable: true,
        value: 2, // Simulate having history
      });
      window.history.back = jest.fn();

      // Call the function
      handleBackNavigation(mockRouter);

      // Should fall back to window.history.back()
      expect(window.history.back).toHaveBeenCalled();
      expect(mockRouter.push).not.toHaveBeenCalled();
      expect(mockRouter.back).not.toHaveBeenCalled();
    });
  });

  describe("getBackButtonHandler", () => {
    let mockRouter: any;

    beforeEach(() => {
      // Setup router mock
      mockRouter = {
        back: jest.fn(),
        push: jest.fn(),
      };

      // Mock handleBackNavigation to test getBackButtonHandler in isolation
      jest.spyOn(window.history, "back").mockImplementation(jest.fn());
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test("should return a function that calls handleBackNavigation", () => {
      // Mock implementation directly
      window.history.back = jest.fn();
      Object.defineProperty(window.history, "length", {
        configurable: true,
        value: 2, // Has history
      });

      // Create a mock location with a non-rationale path
      const mockLocation = {
        ...window.location,
        hostname: "example.com",
        pathname: "/some/path",
      };
      // @ts-ignore
      delete window.location;
      // @ts-ignore
      window.location = mockLocation;

      // Get the handler function
      const handler = getBackButtonHandler(mockRouter);

      // Handler should be a function
      expect(typeof handler).toBe("function");

      // Call the handler
      handler();

      // Should have attempted navigation
      expect(window.history.back).toHaveBeenCalled();
    });

    test("should pass custom home path to handleBackNavigation", () => {
      // Override history.length to force fallback to router.push
      Object.defineProperty(window.history, "length", {
        configurable: true,
        value: 1, // Simulate no history
      });

      // Mock empty referrer to force fallback to router.push
      Object.defineProperty(document, "referrer", {
        configurable: true,
        get: () => "",
      });

      // Create a mock location with a non-rationale path
      const mockLocation = {
        ...window.location,
        hostname: "example.com",
        pathname: "/some/path",
      };
      // @ts-ignore
      delete window.location;
      // @ts-ignore
      window.location = mockLocation;

      // Get the handler with custom path
      const handler = getBackButtonHandler(mockRouter, "/custom-home");

      // Call the handler
      handler();

      // Should use router.push with custom home path
      expect(mockRouter.push).toHaveBeenCalledWith("/custom-home");
    });
  });
});
