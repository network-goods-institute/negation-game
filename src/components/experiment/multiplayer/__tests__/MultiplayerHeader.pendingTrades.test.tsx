import React from "react";
import { render, screen, act } from "@testing-library/react";
import { MultiplayerHeader } from "@/components/experiment/multiplayer/MultiplayerHeader";
import { TooltipProvider } from "@/components/ui/tooltip";

process.env.NEXT_PUBLIC_MARKET_EXPERIMENT_ENABLED = 'true';

class FakeAwareness {
  local: any = {};
  peers = new Map<string, any>();
  handlersList: Array<() => void> = [];
  setLocalStateField(k: string, v: any) {
    this.local = { ...this.local, [k]: v };
    this.emit();
  }
  getStates() {
    const m = new Map<any, any>();
    m.set("local", this.local);
    for (const [k, v] of this.peers.entries()) m.set(k, v);
    return m;
  }
  on(evt: string, fn: () => void) {
    if (evt === "change") this.handlersList = [...this.handlersList, fn];
  }
  off(evt: string, fn: () => void) {
    if (evt === "change") this.handlersList = this.handlersList.filter((h) => h !== fn);
  }
  emit() {
    for (const fn of this.handlersList) fn();
  }
  setPeerState(id: string, state: any) {
    this.peers.set(id, state);
    this.emit();
  }
}

const makeProvider = () => ({ awareness: new FakeAwareness() });

const renderHeader = (provider: any) =>
  render(
    <TooltipProvider>
      <MultiplayerHeader
        username="u"
        userColor="#000"
        provider={provider}
        isConnected
        connectionError={null}
        isSaving={false}
        nextSaveTime={null}
        proxyMode={false}
        title="T"
        connectionState="connected"
        documentId="doc-x"
      />
    </TooltipProvider>
  );

describe("MultiplayerHeader pending trades indicator", () => {
  it("shows 0 by default and updates on trade events", async () => {
    const provider = makeProvider();
    renderHeader(provider);
    const badge = await screen.findByLabelText("Pending trades");
    expect(badge).toHaveTextContent("0");

    await act(async () => {
      window.dispatchEvent(new CustomEvent("market:tradeStarted", { detail: { docId: "doc-x" } }));
    });
    expect(badge).toHaveTextContent("1");

    await act(async () => {
      window.dispatchEvent(new CustomEvent("market:tradeFinished", { detail: { docId: "doc-x" } }));
    });
    expect(badge).toHaveTextContent("0");
  });

  it("aggregates across clients via awareness", async () => {
    const provider = makeProvider();
    renderHeader(provider);
    const badge = await screen.findByLabelText("Pending trades");
    expect(badge).toHaveTextContent("0");

    await act(async () => {
      (provider.awareness as FakeAwareness).setPeerState("peer-1", { marketPending: 2 });
    });
    expect(badge).toHaveTextContent("2");

    await act(async () => {
      window.dispatchEvent(new CustomEvent("market:tradeStarted", { detail: { docId: "doc-x" } }));
    });
    expect(badge).toHaveTextContent("3");

    await act(async () => {
      window.dispatchEvent(new CustomEvent("market:tradeFinished", { detail: { docId: "doc-x" } }));
    });
    expect(badge).toHaveTextContent("2");
  });
});
