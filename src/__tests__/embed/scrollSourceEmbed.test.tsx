import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import ScrollSourceEmbedClient from "@/app/embed/scroll/source/ScrollSourceEmbedClient";

// Mock next/navigation router
jest.mock("next/navigation", () => ({
    useRouter: () => ({ replace: jest.fn() }),
}));

describe("ScrollSourceEmbedClient", () => {
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

    it("normalizes sourceUrl and routes to rationale when detector returns a rationale link", async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ found: true, type: "rationale", rationaleId: "https://negation.game/s/global/rationale/abc123" }),
        });

        render(<ScrollSourceEmbedClient sourceUrl="HTTPS://FORUM.SCROLL.IO/t/some-slug/123?utm_source=x" />);

        await waitFor(() => expect(mockReplace).toHaveBeenCalled());
        expect(mockReplace).toHaveBeenCalledWith("/embed/rationale/abc123");
    });

    it("routes to topic embed, encoding numeric topic ids", async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ found: true, type: "topic", topicId: 42 }),
        });

        render(<ScrollSourceEmbedClient sourceUrl="https://forum.scroll.io/t/topic-title/42" />);

        await waitFor(() => expect(mockReplace).toHaveBeenCalled());
        const [[calledUrl]] = mockReplace.mock.calls;
        expect(calledUrl).toMatch(/^\/embed\/topic\//);
        // encodedId should not be literal 42
        expect(calledUrl).not.toEqual("/embed/topic/42");
    });

    it("shows prompt and Create Topic button when detector not found", async () => {
        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({ ok: true, json: async () => ({ found: false }) })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ found: false }) });

        render(<ScrollSourceEmbedClient sourceUrl="https://forum.scroll.io/t/topic-title/42" />);

        await waitFor(() => expect(screen.getByRole("button", { name: /Create Topic/i })).toBeInTheDocument());
    });
});


