/**
 * @jest-environment node
 */
const http = require("http");
const { WebSocketServer } = require("ws");
const Y = require("yjs");
const { WebsocketProvider } = require("y-websocket");

function waitForConnected(provider: any, timeoutMs = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    let done = false;
    const onStatus = (s: any) => {
      if (s?.status === "connected" && !done) {
        done = true;
        try {
          provider.off?.("status", onStatus);
        } catch {}
        resolve();
      }
    };
    provider.on("status", onStatus);
    const t = setTimeout(() => {
      if (!done) {
        try {
          provider.off?.("status", onStatus);
        } catch {}
        reject(new Error("timeout waiting for connected"));
      }
    }, timeoutMs);
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
  let server: any = null;
  let wss: any = null;
  let baseUrl = "";

  beforeAll(async () => {
    const { setupWSConnection } = require("y-websocket/bin/utils");
    server = http.createServer((req: any, res: any) => {
      res.statusCode = 200;
      res.end("ok");
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve)
    );
    const addr = server.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;
    baseUrl = `ws://127.0.0.1:${port}`;
    wss = new WebSocketServer({ server });
    wss.on("connection", (conn: any, req: any) => {
      setupWSConnection(conn, req, {
        docName: (req.url || "/default").slice(1) || "default",
      });
    });
  });

  afterAll(async () => {
    try {
      if (wss) {
        // Terminate any open client sockets before closing the server
        for (const client of wss.clients) {
          try {
            client.terminate();
          } catch {}
        }
        await new Promise<void>((resolve) => wss.close(() => resolve()));
      }
    } catch {}
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("propagates node map and text updates between two clients", async () => {
    jest.setTimeout(15000);
    const room = "rationale:e2e-sync-1";

    const docA = new Y.Doc();
    const docB = new Y.Doc();

    const providerA = new WebsocketProvider(baseUrl, room, docA);
    const providerB = new WebsocketProvider(baseUrl, room, docB);

    await Promise.all([
      waitForConnected(providerA),
      waitForConnected(providerB),
    ]);

    const yNodesA = docA.getMap("nodes") as any;
    const yTextA = docA.getMap("node_text") as any;

    // Apply changes on A
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

    // Wait for B to reflect it
    const yNodesB = docB.getMap("nodes") as any;
    const yTextB = docB.getMap("node_text") as any;
    await waitFor(() => Boolean(yNodesB.get("p-1")));
    const nodeB = yNodesB.get("p-1");
    expect(nodeB?.id).toBe("p-1");
    expect(nodeB?.data?.content).toBe("Hello");
    const textB = yTextB.get("p-1");
    expect(textB?.toString()).toBe("Hello");

    // Update text on B and expect A to receive it
    docB.transact(() => {
      const tb = yTextB.get("p-1")!;
      tb.insert(tb.length, " world");
    }, "local");

    await waitFor(() => yTextA.get("p-1")?.toString() === "Hello world");
    expect(yTextA.get("p-1")?.toString()).toBe("Hello world");

    // Cleanup
    providerA.destroy();
    providerB.destroy();
  });
});
