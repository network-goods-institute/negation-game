import { renderHook, act } from "@testing-library/react";
import { usePrivy } from "@privy-io/react-auth";
import { useUser } from "@/queries/users/useUser";
import { useCurrentSpace } from "@/hooks/utils/useCurrentSpace";
import { useDelegateLinksPrompt } from "../useDelegateLinksPrompt";

jest.mock("@privy-io/react-auth", () => ({
  usePrivy: jest.fn(),
}));
jest.mock("@/queries/users/useUser");
jest.mock("@/hooks/utils/useCurrentSpace");

const mockUsePrivy = usePrivy as jest.MockedFunction<typeof usePrivy>;
const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;
const mockUseCurrentSpace = useCurrentSpace as jest.MockedFunction<
  typeof useCurrentSpace
>;

describe("useDelegateLinksPrompt", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock localStorage
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });

    // Default to scroll space for most tests
    mockUseCurrentSpace.mockReturnValue("scroll");
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("does not show prompt when user is not ready", () => {
    mockUsePrivy.mockReturnValue({
      user: null,
      ready: false,
    } as any);
    mockUseUser.mockReturnValue({ data: null } as any);

    const { result } = renderHook(() => useDelegateLinksPrompt());

    expect(result.current.isOpen).toBe(false);
  });

  it("does not show prompt when user is not authenticated", () => {
    mockUsePrivy.mockReturnValue({
      user: null,
      ready: true,
    } as any);
    mockUseUser.mockReturnValue({ data: null } as any);

    const { result } = renderHook(() => useDelegateLinksPrompt());

    expect(result.current.isOpen).toBe(false);
  });

  it("does not show prompt when not in scroll space", () => {
    mockUseCurrentSpace.mockReturnValue("global");
    (localStorage.getItem as jest.Mock).mockReturnValue(null);

    mockUsePrivy.mockReturnValue({
      user: { id: "test-user" },
      ready: true,
    } as any);
    mockUseUser.mockReturnValue({
      data: {
        id: "test-user",
        agoraLink: null,
        scrollDelegateLink: null,
        delegationUrl: null,
      },
    } as any);

    const { result } = renderHook(() => useDelegateLinksPrompt());

    expect(result.current.isOpen).toBe(false);

    // Fast-forward timer to ensure it doesn't show even after delay
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(result.current.isOpen).toBe(false);
  });

  it("does not show prompt when user has already seen it", () => {
    (localStorage.getItem as jest.Mock).mockReturnValue("true");

    mockUsePrivy.mockReturnValue({
      user: { id: "test-user" },
      ready: true,
    } as any);
    mockUseUser.mockReturnValue({ data: { id: "test-user" } } as any);

    const { result } = renderHook(() => useDelegateLinksPrompt());

    expect(result.current.isOpen).toBe(false);
  });

  it("does not show prompt when user has all three governance link types", () => {
    (localStorage.getItem as jest.Mock).mockReturnValue(null);

    mockUsePrivy.mockReturnValue({
      user: { id: "test-user" },
      ready: true,
    } as any);
    mockUseUser.mockReturnValue({
      data: {
        id: "test-user",
        agoraLink: "https://agora.xyz/delegates/test-user",
        scrollDelegateLink: "https://gov.scroll.io/delegates/test-user",
        delegationUrl: "https://example.com/delegate",
      },
    } as any);

    const { result } = renderHook(() => useDelegateLinksPrompt());

    expect(result.current.isOpen).toBe(false);
    expect(localStorage.setItem).toHaveBeenCalledWith(
      "hasSeenDelegatePrompt",
      "true"
    );
  });

  it("shows prompt after delay when conditions are met and in scroll space", () => {
    (localStorage.getItem as jest.Mock).mockReturnValue(null);

    mockUsePrivy.mockReturnValue({
      user: { id: "test-user" },
      ready: true,
    } as any);
    mockUseUser.mockReturnValue({
      data: {
        id: "test-user",
        agoraLink: null,
        scrollDelegateLink: null,
        delegationUrl: null,
      },
    } as any);

    const { result } = renderHook(() => useDelegateLinksPrompt());

    expect(result.current.isOpen).toBe(false);

    // Fast-forward timer
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(result.current.isOpen).toBe(true);
  });

  it("shows prompt when user has only scrollDelegateLink but not others", () => {
    (localStorage.getItem as jest.Mock).mockReturnValue(null);

    mockUsePrivy.mockReturnValue({
      user: { id: "test-user" },
      ready: true,
    } as any);
    mockUseUser.mockReturnValue({
      data: {
        id: "test-user",
        agoraLink: null,
        scrollDelegateLink: "https://gov.scroll.io/delegates/test-user",
        delegationUrl: null,
      },
    } as any);

    const { result } = renderHook(() => useDelegateLinksPrompt());

    expect(result.current.isOpen).toBe(false);

    // Fast-forward timer
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(result.current.isOpen).toBe(true);
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  it("shows prompt when user has only delegationUrl but not others", () => {
    (localStorage.getItem as jest.Mock).mockReturnValue(null);

    mockUsePrivy.mockReturnValue({
      user: { id: "test-user" },
      ready: true,
    } as any);
    mockUseUser.mockReturnValue({
      data: {
        id: "test-user",
        agoraLink: null,
        scrollDelegateLink: null,
        delegationUrl: "https://example.com/delegate",
      },
    } as any);

    const { result } = renderHook(() => useDelegateLinksPrompt());

    expect(result.current.isOpen).toBe(false);

    // Fast-forward timer
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(result.current.isOpen).toBe(true);
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  it("shows prompt when user has only agoraLink but not others", () => {
    (localStorage.getItem as jest.Mock).mockReturnValue(null);

    mockUsePrivy.mockReturnValue({
      user: { id: "test-user" },
      ready: true,
    } as any);
    mockUseUser.mockReturnValue({
      data: {
        id: "test-user",
        agoraLink: "https://agora.xyz/delegates/test-user",
        scrollDelegateLink: null,
        delegationUrl: null,
      },
    } as any);

    const { result } = renderHook(() => useDelegateLinksPrompt());

    expect(result.current.isOpen).toBe(false);

    // Fast-forward timer
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(result.current.isOpen).toBe(true);
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });
});
