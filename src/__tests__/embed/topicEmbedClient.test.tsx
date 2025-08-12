import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopicEmbedClient } from "@/app/embed/topic/[topicId]/TopicEmbedClient";

describe("TopicEmbedClient", () => {
    const topic = { id: 1, name: "Test Topic", space: "scroll" } as any;
    const rationales = [
        {
            id: "abc",
            title: "Rationale A",
            createdAt: new Date(),
            authorUsername: "alice",
            statistics: { views: 1, copies: 0, totalCred: 0, averageFavor: 0 },
        },
    ] as any[];

    it("renders header and rationale card", () => {
        render(<TopicEmbedClient topic={topic} rationales={rationales} />);
        expect(screen.getByText(/Negation Game × Scroll/)).toBeInTheDocument();
        expect(screen.getByText(/Rationale A/)).toBeInTheDocument();
    });

    it("clicking a card triggers view action (selects rationale)", async () => {
        render(<TopicEmbedClient topic={topic} rationales={rationales} />);
        const card = screen.getByText(/Rationale A/).closest('div');
        if (!card) throw new Error("Card not found");
        await userEvent.click(card);
        // After click, the iframe should be present (we don't check its src directly)
        expect(document.querySelector('iframe')).toBeInTheDocument();
    });

    it("clicking Open does not trigger inline selection (stopPropagation)", async () => {
        render(<TopicEmbedClient topic={topic} rationales={rationales} />);
        const openLink = screen.getByRole('link', { name: /Open/i });
        await userEvent.click(openLink);
        // Should not create inline iframe selection due to stopPropagation
        expect(document.querySelector('iframe')).not.toBeInTheDocument();
    });
});


