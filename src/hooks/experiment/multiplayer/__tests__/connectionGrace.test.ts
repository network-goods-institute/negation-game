import { createConnectionGrace } from "@/hooks/experiment/multiplayer/connectionGrace";

jest.useFakeTimers();

describe("connection grace", () => {
  it("does not emit false within grace", () => {
    const cb = jest.fn();
    const g = createConnectionGrace(1000, cb);
    g.onStatus(true);
    g.onStatus(false);
    jest.advanceTimersByTime(900);
    expect(cb.mock.calls.map((c) => c[0])).toEqual([true]);
    g.onStatus(true);
    jest.runOnlyPendingTimers();
    expect(cb.mock.calls.map((c) => c[0])).toEqual([true]);
    g.dispose();
  });

  it("emits false after grace when still disconnected", () => {
    const cb = jest.fn();
    const g = createConnectionGrace(500, cb);
    g.onStatus(true);
    g.onStatus(false);
    jest.advanceTimersByTime(600);
    expect(cb.mock.calls.map((c) => c[0])).toEqual([true, false]);
    g.dispose();
  });

  it("debounces repeated false statuses", () => {
    const cb = jest.fn();
    const g = createConnectionGrace(300, cb);
    g.onStatus(true);
    g.onStatus(false);
    g.onStatus(false);
    jest.advanceTimersByTime(400);
    expect(cb.mock.calls.map((c) => c[0])).toEqual([true, false]);
    g.dispose();
  });

  it("forces immediate disconnect on error", () => {
    const cb = jest.fn();
    const g = createConnectionGrace(1000, cb);
    g.onStatus(true);
    g.forceDisconnectNow();
    expect(cb.mock.calls.map((c) => c[0])).toEqual([true, false]);
    g.dispose();
  });
});

