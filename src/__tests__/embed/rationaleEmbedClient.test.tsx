import React from "react";
import { render } from "@testing-library/react";
import { RationaleEmbedClient } from "@/app/embed/rationale/[rationaleId]/RationaleEmbedClient";

describe("RationaleEmbedClient", () => {
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
                { id: "p1", position: { x: 100, y: 100 }, data: { content: "Point 1" } },
            ],
            edges: [],
        },
    } as any;

    it("renders container and minimap", () => {
        const { getByText } = render(<RationaleEmbedClient rationale={rationale} />);
        expect(getByText(/Title/)).toBeInTheDocument();
    });
});


