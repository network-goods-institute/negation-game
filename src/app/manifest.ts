import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Negation Game - Protocol for Reasoned Disagreement",
    short_name: "Negation Game",
    description:
      "A protocol layer for reasoned disagreement: powered by economic incentives, governed by epistemic values, and designed for minds willing to change. Transform debates into structured, accountable discussions.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#667eea",
    orientation: "portrait-primary",
    categories: ["productivity", "social", "education"],
    lang: "en-US",
    dir: "ltr",
    scope: "/",
    icons: [
      {
        src: "/img/negation-game.png",
        sizes: "1200x630",
        type: "image/png",
        purpose: "any",
      },
    ],
    screenshots: [
      {
        src: "/img/negation-game.png",
        sizes: "1200x630",
        type: "image/png",
        form_factor: "wide",
        label: "Negation Game interface showing structured debate platform",
      },
    ],
    related_applications: [],
    prefer_related_applications: false,
  };
}
