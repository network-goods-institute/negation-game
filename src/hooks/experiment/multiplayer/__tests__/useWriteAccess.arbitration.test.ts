import { renderHook, act } from "@testing-library/react";
import { useWriteAccess } from "@/hooks/experiment/multiplayer/useWriteAccess";

class MockAwareness {
  private _states = new Map<number, any>();
  private listeners = new Set<() => void>();
  public clientID: number;
  constructor(clientID: number) {
    this.clientID = clientID;
  }
  getLocalState() {
    return this._states.get(this.clientID) || {};
  }
  setLocalState(state: any) {
    this._states.set(this.clientID, state);
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

describe("useWriteAccess arbitration", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("grants write to lowest client across sessions for same user", () => {
    const awareness = new MockAwareness(5);
    const provider = makeProvider(awareness);

    // Two tabs for the same user: clients 3 and 5
    // Local is 5, remote lower 3 should win when session differs
    awareness.setLocalState({ user: { id: "u1", name: "Alice", color: "#f00", sessionId: "s-local" } });
    // remote with lower clientID and different session
    // @ts-ignore test injection
    awareness._states.set(3, { user: { id: "u1", name: "Alice", color: "#f00", sessionId: "s-remote" } });

    const { result } = renderHook(() => useWriteAccess(provider, "u1"));

    act(() => {
      jest.advanceTimersByTime(1100);
    });

    expect(result.current.canWrite).toBe(false);
  });

  it("writes when it is the lowest session group for same user", () => {
    const awareness = new MockAwareness(2);
    const provider = makeProvider(awareness);

    // local 2, remote 7 -> local should win (different sessions)
    awareness.setLocalState({ user: { id: "u1", sessionId: "s-local" } });
    // @ts-ignore test injection
    awareness._states.set(7, { user: { id: "u1", sessionId: "s-remote" } });

    const { result } = renderHook(() => useWriteAccess(provider, "u1"));

    act(() => {
      jest.advanceTimersByTime(1100);
    });

    expect(result.current.canWrite).toBe(true);
  });

  it("allows all tabs in the same session to write", () => {
    const awareness = new MockAwareness(7);
    const provider = makeProvider(awareness);

    // Two local-like tabs of same user and same session: 3 and 7
    awareness.setLocalState({ user: { id: "u1", sessionId: "s-local" } });
    // @ts-ignore test injection
    awareness._states.set(3, { user: { id: "u1", sessionId: "s-local" } });

    const { result } = renderHook(() => useWriteAccess(provider, "u1"));

    act(() => {
      jest.advanceTimersByTime(1100);
    });

    expect(result.current.canWrite).toBe(true);
  });

  it("adopts same-session group before local awareness publish", () => {
    localStorage.setItem("multiplayer-session-id", "s-shared");
    const awareness = new MockAwareness(9);
    const provider = makeProvider(awareness);

    // Remote same-session exists with lower client (3)
    // @ts-ignore test injection
    awareness._states.set(3, { user: { id: "u1", sessionId: "s-shared" } });

    const { result } = renderHook(() => useWriteAccess(provider, "u1"));
    act(() => {
      jest.advanceTimersByTime(1100);
    });
    expect(result.current.canWrite).toBe(true);
  });

  it("does not grant write if local hasn't published user and a lower remote exists", () => {
    const awareness = new MockAwareness(5);
    const provider = makeProvider(awareness);

    // Do not set local user in awareness
    // Remote user present with lower client and different session
    // @ts-ignore test injection
    awareness._states.set(3, { user: { id: "u1", sessionId: "s-remote" } });

    const { result } = renderHook(() => useWriteAccess(provider, "u1"));

    act(() => {
      jest.advanceTimersByTime(1100);
    });

    expect(result.current.canWrite).toBe(false);
  });
});
