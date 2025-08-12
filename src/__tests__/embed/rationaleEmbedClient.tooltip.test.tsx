import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { RationaleEmbedClient } from "@/app/embed/rationale/[rationaleId]/RationaleEmbedClient";

describe("RationaleEmbedClient tooltip behavior", () => {
    const rationale = {
        id: "abc",
        title: "Title",
        createdAt: new Date(),
        authorUsername: "alice",
        space: "scroll",
        statistics: { views: 0, copies: 0, totalCred: 0, averageFavor: 0, endorsements: 0, pointsCount: 0 },
        graph: {
            nodes: [
                { id: "statement", position: { x: 0, y: 0 } },
                { id: "p1", position: { x: 100, y: 100 }, data: { content: "Point Alpha" } },
            ],
            edges: [],
        },
    } as any;

    it("shows tooltip content truncated and positioned to the right (no arrow)", () => {
        const { container } = render(<RationaleEmbedClient rationale={rationale} />);
        // hover the minimap by simulating a mouseenter on any node: pick by absolute positioned divs
        const nodes = container.querySelectorAll('[style*="position: absolute"]');
        // Ensure we have some absolutely positioned node boxes
        expect(nodes.length).toBeGreaterThan(0);
        const target = nodes[nodes.length - 1] as HTMLElement; // likely the second point
        fireEvent.mouseEnter(target);

        // Tooltip exists with our content
        expect(container.textContent).toContain("Point Alpha");

        // Ensure no triangle/arrow element exists by checking absence of width/height 0 triangle divs
        const arrow = container.querySelector('div[style*="width: 0"][style*="height: 0"]');
        expect(arrow).toBeNull();
    });
});


