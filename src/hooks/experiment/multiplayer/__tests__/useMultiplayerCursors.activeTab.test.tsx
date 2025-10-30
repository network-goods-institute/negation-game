import { renderHook } from "@testing-library/react";
import { useMultiplayerCursors } from "@/hooks/experiment/multiplayer/useMultiplayerCursors";

class MockAwareness {
  private _state: any = {};
  private listeners = new Set<() => void>();
  getLocalState() {
    return this._state;
  }
  setLocalState(state: any) {
    this._state = state;
    this.emit();
  }
  getStates() {
    return new Map<number, any>();
  }
  on(_event: string, cb: any) {
    this.listeners.add(cb);
  }
  off(_event: string, cb: any) {
    this.listeners.delete(cb);
  }
  emit() {
    this.listeners.forEach((cb) => cb());
  }
}

const makeProvider = (awareness: any) => ({ awareness } as any);

describe("useMultiplayerCursors active tab gating", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("broadcasts initial cursor in active tab", async () => {
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    const awareness = new MockAwareness();
    const provider = makeProvider(awareness);

    renderHook(() =>
      useMultiplayerCursors({ provider, userId: "u1", username: "Alice", userColor: "#f00", canWrite: true, broadcastCursor: true })
    );

    const user = awareness.getLocalState()?.user;
    expect(user?.cursor).toBeDefined();
    expect(user?.cursor?.fx).toBe(0);
    expect(user?.cursor?.fy).toBe(0);
  });

  it("does not broadcast cursor in inactive tab", async () => {
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    const awareness = new MockAwareness();
    const provider = makeProvider(awareness);

    // pre-populate editing/locks to ensure they get cleared by inactive tab branch
    awareness.setLocalState({ user: { id: "u1", name: "Alice", color: "#f00" }, editing: { nodeId: "A", ts: Date.now() }, locks: { A: { ts: Date.now(), kind: "edit" } } });

    renderHook(() =>
      useMultiplayerCursors({ provider, userId: "u1", username: "Alice", userColor: "#f00", canWrite: true, broadcastCursor: true })
    );

    const state = awareness.getLocalState();
    const user = state?.user;
    expect(user?.cursor).toBeUndefined();
    expect(state?.editing).toBeUndefined();
    expect(state?.locks).toBeUndefined();
  });
});
