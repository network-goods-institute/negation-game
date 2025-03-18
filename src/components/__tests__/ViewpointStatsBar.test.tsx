import React from "react";
import { render, screen } from "@/__tests__/utils/test-utils";
import { ViewpointStatsBar } from "../ViewpointStatsBar";

describe("ViewpointStatsBar", () => {
    it("renders view and copy counts", () => {
        render(<ViewpointStatsBar views={100} copies={50} />);

        // Check for view count
        expect(screen.getByText("100")).toBeInTheDocument();

        // Check for copy count
        expect(screen.getByText("50")).toBeInTheDocument();
    });

    it("formats large numbers with appropriate suffixes", () => {
        render(<ViewpointStatsBar views={1500} copies={2500000} />);

        // Check for formatted view count (1.5k)
        expect(screen.getByText("1.5k")).toBeInTheDocument();

        // Check for formatted copy count (2.5M)
        expect(screen.getByText("2.5M")).toBeInTheDocument();
    });

    it("applies custom className when provided", () => {
        const { container } = render(
            <ViewpointStatsBar views={100} copies={50} className="custom-class" />
        );

        // Find the top-level div
        const statsBar = container.querySelector("div");

        // Check if it has the custom class
        expect(statsBar).toHaveClass("custom-class");
    });

    it("renders icons for views and copies", () => {
        const { container } = render(<ViewpointStatsBar views={100} copies={50} />);

        // Find SVG elements (these are the icons)
        const eyeIcon = container.querySelector('.lucide-eye');
        const copyIcon = container.querySelector('.lucide-copy');

        // Verify icons exist
        expect(eyeIcon).toBeInTheDocument();
        expect(copyIcon).toBeInTheDocument();
    });
}); 