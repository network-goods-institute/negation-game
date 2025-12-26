jest.mock("posthog-js", () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
    capture: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
  },
}));

const loadClient = async (env?: { key?: string; host?: string }) => {
  jest.resetModules();
  if (env?.key === undefined) {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
  } else {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = env.key;
  }
  if (env?.host === undefined) {
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
  } else {
    process.env.NEXT_PUBLIC_POSTHOG_HOST = env.host;
  }
  const client = await import("@/lib/analytics/posthogClient");
  const posthog = (await import("posthog-js")).default;
  return { client, posthog };
};

describe("posthogClient", () => {
  it("skips capture without a key", async () => {
    const { client, posthog } = await loadClient();
    client.capturePostHogEvent("test-event");
    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it("initializes and captures with a key", async () => {
    const { client, posthog } = await loadClient({
      key: "ph_test_key",
      host: "https://app.posthog.com",
    });
    client.capturePostHogEvent("test-event", { foo: "bar" });
    expect(posthog.init).toHaveBeenCalledWith(
      "ph_test_key",
      expect.objectContaining({
        api_host: "https://app.posthog.com",
        capture_pageview: false,
        capture_pageleave: true,
      })
    );
    expect(posthog.capture).toHaveBeenCalledWith("test-event", { foo: "bar" });
  });

  it("identifies and resets with a key", async () => {
    const { client, posthog } = await loadClient({
      key: "ph_test_key",
    });
    client.identifyPostHogUser("user-1", { role: "member" });
    client.resetPostHog();
    expect(posthog.identify).toHaveBeenCalledWith("user-1", {
      role: "member",
    });
    expect(posthog.reset).toHaveBeenCalled();
  });
});
