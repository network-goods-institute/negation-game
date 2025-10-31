import { renderHook, act } from "@testing-library/react";
import { useMultiplayerEditing } from "@/hooks/experiment/multiplayer/useMultiplayerEditing";

class MockAwareness {
  private _states = new Map<number, any>();
  private listeners = new Set<() => void>();
  public localId = 1;
  getLocalState() {
    return this._states.get(this.localId) || {};
  }
  setLocalState(state: any) {
    this._states.set(this.localId, state);
    this.emit();
  }
  getStates() {
    return this._states;
  }
  on(_event: string, cb: any) {
    this.listeners.add(cb);
  }
  off(_event: string, cb: any) {
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    this.listeners.delete(cb);
  }
  emit() {
    this.listeners.forEach((cb) => cb());
  }
}

const makeProvider = (awareness: any) => ({ awareness } as any);

describe("useMultiplayerEditing same-session bypass", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("does not block when lock is from same session (different tab)", () => {
    const awareness = new MockAwareness();
    const provider = makeProvider(awareness);

    const { result } = renderHook(() =>
      useMultiplayerEditing({ provider, userId: "u1", username: "Alice", userColor: "#f00", canWrite: true, broadcastLocks: true })
    );

    const local = awareness.getLocalState();
    const localSessionId = local?.user?.sessionId as string;
    expect(typeof localSessionId).toBe("string");

    const remoteState = {
      user: { id: "u1", name: "Alice", color: "#f00", sessionId: localSessionId, tabId: "t-2" },
      locks: { A: { kind: "edit", ts: Date.now(), sessionId: localSessionId, tabId: "t-2" } },
    } as any;
    // @ts-ignore test access
    awareness._states.set(2, remoteState);
    act(() => {
      awareness.emit();
      awareness.setLocalState({ ...awareness.getLocalState() });
    });

    expect(result.current.isLockedForMe("A")).toBe(false);
  });

  it("does not block when lock is from same tab", () => {
    const awareness = new MockAwareness();
    const provider = makeProvider(awareness);

    const { result } = renderHook(() =>
      useMultiplayerEditing({ provider, userId: "u1", username: "Alice", userColor: "#f00", canWrite: true, broadcastLocks: true })
    );

    const local = awareness.getLocalState();
    const localSessionId = local?.user?.sessionId as string;
    const localTabId = local?.user?.tabId as string;

    const remoteState = {
      user: { id: "u1", name: "Alice", color: "#f00", sessionId: localSessionId, tabId: localTabId },
      locks: { A: { kind: "edit", ts: Date.now(), sessionId: localSessionId, tabId: localTabId } },
    } as any;
    // @ts-ignore test access
    awareness._states.set(2, remoteState);
    act(() => {
      awareness.emit();
      awareness.setLocalState({ ...awareness.getLocalState() });
    });

    expect(result.current.isLockedForMe("A")).toBe(false);
  });

  it("ignores stale locks older than TTL", () => {
    const awareness = new MockAwareness();
    const provider = makeProvider(awareness);

    const { result } = renderHook(() =>
      useMultiplayerEditing({ provider, userId: "u1", username: "Alice", userColor: "#f00", canWrite: true, broadcastLocks: true })
    );

    const remoteState = {
      user: { id: "u2", name: "Bob", color: "#0f0", sessionId: "s2", tabId: "t-9" },
      locks: { A: { kind: "edit", ts: Date.now() - 20000, sessionId: "s2", tabId: "t-9" } },
    } as any;
    // @ts-ignore test access
    awareness._states.set(2, remoteState);
    act(() => {
      awareness.emit();
      awareness.setLocalState({ ...awareness.getLocalState() });
    });

    expect(result.current.isLockedForMe("A")).toBe(false);
  });
});
