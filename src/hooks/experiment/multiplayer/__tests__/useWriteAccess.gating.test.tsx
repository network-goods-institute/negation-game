import { renderHook, act, waitFor } from "@testing-library/react";
import { useWriteAccess } from "@/hooks/experiment/multiplayer/useWriteAccess";

jest.mock("@/utils/hosts", () => ({
  isProductionRequest: () => true,
}));

describe("useWriteAccess - prod anon gating", () => {
  it("returns canWrite=false for anonymous on production even without provider", async () => {
    const { result } = renderHook(() =>
      useWriteAccess(null as any, "any-user", { authenticated: false })
    );

    await waitFor(() => {
      expect(result.current.canWrite).toBe(false);
    });
  });

  it("returns canWrite=true for authenticated on production", async () => {
    const { result } = renderHook(() =>
      useWriteAccess(null as any, "any-user", { authenticated: true })
    );

    await waitFor(() => {
      expect(result.current.canWrite).toBe(true);
    });
  });
});


