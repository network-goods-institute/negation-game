import React from "react";
import { render, waitFor } from "@testing-library/react";
import ScrollSourceEmbedClient from "@/app/embed/scroll/source/ScrollSourceEmbedClient";

jest.mock("next/navigation", () => ({ useRouter: () => ({ replace: jest.fn() }) }));

describe("ScrollSourceEmbedClient fallback detection", () => {
    const originalFetch = global.fetch;
    const mockReplace = jest.fn();

    beforeEach(() => {
        (global as any).fetch = jest.fn();
        jest.spyOn(require("next/navigation"), "useRouter").mockReturnValue({ replace: mockReplace });
        mockReplace.mockReset();
    });

    afterEach(() => {
        global.fetch = originalFetch as any;
        jest.resetAllMocks();
    });

    it("retries by stripping trailing numeric id when initial detection fails", async () => {
        // First call (full URL) returns not found
        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({ ok: true, json: async () => ({ found: false }) })
            // Second call (stripped URL) returns found topic
            .mockResolvedValueOnce({ ok: true, json: async () => ({ found: true, type: "topic", topicId: "some-slug" }) });

        render(
            <ScrollSourceEmbedClient sourceUrl="https://forum.scroll.io/t/some-topic/992" />
        );

        await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/embed/topic/some-slug"));
    });
});


