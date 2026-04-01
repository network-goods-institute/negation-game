/**
 * @jest-environment node
 */
const { WebSocketServer } = require("ws");
const Y = require("yjs");
const { WebsocketProvider } = require("y-websocket");

function waitForConnected(provider: any, timeoutMs = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    let done = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const finish = (fn: () => void) => {
      if (done) return;
      done = true;
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      try {
        provider.off?.("status", onStatus);
      } catch {}
      fn();
    };
    const onStatus = (s: any) => {
      if (s?.status === "connected") finish(resolve);
    };
    provider.on("status", onStatus);
    timeout = setTimeout(
      () => finish(() => reject(new Error("timeout waiting for connected"))),
      timeoutMs
    );
  });
}

function waitFor(
  predicate: () => boolean,
  timeoutMs = 8000,
  intervalMs = 25
): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      try {
        if (predicate()) return resolve();
      } catch {}
      if (Date.now() - start > timeoutMs) return reject(new Error("timeout"));
      setTimeout(tick, intervalMs);
    };
    tick();
  });
}

describe("multiplayer sync e2e (websocket)", () => {
  let wsUtils: any = null;
  let wss: any = null;
  let baseUrl = "";

  beforeAll(async () => {
    wsUtils = require("y-websocket/bin/utils");
    const { setupWSConnection } = wsUtils;
    wss = new WebSocketServer({ host: "127.0.0.1", port: 0 });
    await new Promise<void>((resolve, reject) => {
      const onListening = () => {
        try {
          wss.off?.("error", onError);
        } catch {}
        resolve();
      };
      const onError = (err: Error) => {
        try {
          wss.off?.("listening", onListening);
        } catch {}
        reject(err);
      };
      wss.once("listening", onListening);
      wss.once("error", onError);
    });
    wss._server?.unref?.();
    const addr = wss.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;
    baseUrl = `ws://127.0.0.1:${port}`;
    wss.on("connection", (conn: any, req: any) => {
      setupWSConnection(conn, req, {
        docName: (req.url || "/default").slice(1) || "default",
      });
    });
  });

  afterAll(async () => {
    try {
      if (wss) {
        for (const client of wss.clients) {
          try {
            client.terminate();
          } catch {}
        }
        await new Promise<void>((resolve) => wss.close(() => resolve()));
      }
    } catch {}
    try {
      if (wsUtils?.docs) {
        for (const [name, doc] of wsUtils.docs.entries()) {
          try {
            doc.destroy?.();
          } catch {}
          try {
            wsUtils.docs.delete(name);
          } catch {}
        }
      }
    } catch {}
  });

  it("propagates node map and text updates between two clients", async () => {
    jest.setTimeout(15000);
    const room = "rationale:e2e-sync-1";

    const docA = new Y.Doc();
    const docB = new Y.Doc();

    const providerA = new WebsocketProvider(baseUrl, room, docA);
    const providerB = new WebsocketProvider(baseUrl, room, docB);
    try {
      await Promise.all([
        waitForConnected(providerA),
        waitForConnected(providerB),
      ]);

      const yNodesA = docA.getMap("nodes") as any;
      const yTextA = docA.getMap("node_text") as any;

      docA.transact(() => {
        yNodesA.set("p-1", {
          id: "p-1",
          type: "point",
          position: { x: 10, y: 20 },
          data: { content: "Hello" },
        } as any);
        const t = new Y.Text();
        t.insert(0, "Hello");
        yTextA.set("p-1", t);
      }, "local");

      const yNodesB = docB.getMap("nodes") as any;
      const yTextB = docB.getMap("node_text") as any;
      await waitFor(() => Boolean(yNodesB.get("p-1")));
      const nodeB = yNodesB.get("p-1");
      expect(nodeB?.id).toBe("p-1");
      expect(nodeB?.data?.content).toBe("Hello");
      const textB = yTextB.get("p-1");
      expect(textB?.toString()).toBe("Hello");

      docB.transact(() => {
        const tb = yTextB.get("p-1")!;
        tb.insert(tb.length, " world");
      }, "local");

      await waitFor(() => yTextA.get("p-1")?.toString() === "Hello world");
      expect(yTextA.get("p-1")?.toString()).toBe("Hello world");
    } finally {
      try {
        providerA.disconnect?.();
      } catch {}
      try {
        providerB.disconnect?.();
      } catch {}
      try {
        providerA.destroy?.();
      } catch {}
      try {
        providerB.destroy?.();
      } catch {}
      try {
        docA.destroy?.();
      } catch {}
      try {
        docB.destroy?.();
      } catch {}
    }
  });
});
