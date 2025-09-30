import React from "react";

const makeIcon = (
  color: string,
  angles: number[],
  length = 11,
  thickness = 2
): React.ReactNode => {
  return React.createElement(
    "div",
    {
      style: { position: "relative", width: "12px", height: "12px" },
    },
    ...angles.map((deg, i) =>
      React.createElement("div", {
        key: `bar-${i}`,
        style: {
          position: "absolute",
          left: "50%",
          top: "50%",
          width: `${length}px`,
          height: `${thickness}px`,
          backgroundColor: color,
          transform: `translate(-50%, -50%) rotate(${deg}deg)`,
          borderRadius: `${thickness / 2}px`,
        },
      })
    )
  );
};

export type EdgeType =
  | "negation"
  | "objection"
  | "option"
  | "support"
  | "statement";

export interface EdgeVisualConfig {
  // Colors
  stroke: string;
  borderColor: string;
  starColor: string;

  // Style
  strokeDasharray?: string;
  strokeWidth: (relevance: number) => number;
  curvature?: number;

  // Gradient configuration for strap edges
  gradientId?: string;
  gradientStops?: Array<{
    offset: string;
    stopColor: string;
    stopOpacity: number;
  }>;

  // Midpoint control
  midpointContent: React.ReactNode;

  // Labels
  label?: string;
  labelStyle?: React.CSSProperties;

  // Geometry
  useStrap?: boolean;
  useBezier?: boolean;
}

export interface EdgeBehaviorConfig {
  // Context menu items (beyond standard ones)
  showRelevanceInContextMenu: boolean;

  // Interaction
  interactionWidth: number;

  // Performance
  simplifyDuringDrag: boolean;
}

export interface EdgeConfig {
  type: EdgeType;
  visual: EdgeVisualConfig;
  behavior: EdgeBehaviorConfig;
}

export const EDGE_CONFIGURATIONS: Record<EdgeType, EdgeConfig> = {
  negation: {
    type: "negation",
    visual: {
      stroke: "#9CA3AF",
      borderColor: "#9CA3AF",
      starColor: "text-stone-600",
      strokeWidth: (relevance) => Math.max(1, Math.min(8, relevance * 1.6)),
      strokeDasharray: "6,6",
      gradientId: "neg-strap-gradient",
      gradientStops: [
        { offset: "0%", stopColor: "#9CA3AF", stopOpacity: 0.15 },
        { offset: "100%", stopColor: "#6B7280", stopOpacity: 0.15 },
      ],
      midpointContent: makeIcon("#9CA3AF", [0]),
      useStrap: true,
      useBezier: false,
    },
    behavior: {
      showRelevanceInContextMenu: false,
      interactionWidth: 24,
      simplifyDuringDrag: false,
    },
  },

  objection: {
    type: "objection",
    visual: {
      stroke: "#f97316",
      borderColor: "#f97316",
      starColor: "text-orange-600",
      strokeWidth: (relevance) => Math.max(1, Math.min(8, relevance * 1.6)),
      strokeDasharray: "8,4",
      midpointContent: makeIcon("#f97316", [45], 12, 2),
      useBezier: true,
      curvature: 0.35,
    },
    behavior: {
      showRelevanceInContextMenu: false,
      interactionWidth: 24,
      simplifyDuringDrag: true,
    },
  },

  option: {
    type: "option",
    visual: {
      stroke: "#2563eb",
      borderColor: "#2563eb",
      starColor: "text-blue-600",
      strokeWidth: (relevance) => Math.max(1, Math.min(8, relevance * 1.6)),
      gradientId: "quest-strap-gradient",
      gradientStops: [
        { offset: "0%", stopColor: "#1e40af", stopOpacity: 0.22 },
        { offset: "100%", stopColor: "#3b82f6", stopOpacity: 0.22 },
      ],
      midpointContent: React.createElement(
        "svg",
        {
          width: "12",
          height: "12",
          viewBox: "0 0 12 12",
          style: { display: "block" },
        },
        React.createElement("path", {
          d: "M 4.5 3.5 C 4.5 2.5 5 2 6 2 C 7 2 7.5 2.5 7.5 3.5 C 7.5 4.5 6.5 5 6 6 L 6 7.5 M 6 9.5 L 6 10",
          stroke: "#2563eb",
          strokeWidth: "1.5",
          strokeLinecap: "round",
          fill: "none",
        })
      ),
      useStrap: true,
      useBezier: false,
    },
    behavior: {
      showRelevanceInContextMenu: false,
      interactionWidth: 24,
      simplifyDuringDrag: false,
    },
  },

  support: {
    type: "support",
    visual: {
      stroke: "#9CA3AF",
      borderColor: "#9CA3AF",
      starColor: "text-gray-600",
      strokeWidth: (relevance) => Math.max(1, Math.min(8, relevance * 1.4)),
      midpointContent: makeIcon("#9CA3AF", [0, 90]),
      useBezier: false,
    },
    behavior: {
      showRelevanceInContextMenu: false,
      interactionWidth: 24,
      simplifyDuringDrag: false,
    },
  },

  statement: {
    type: "statement",
    visual: {
      stroke: "#6b7280",
      borderColor: "#6b7280",
      starColor: "text-gray-600",
      strokeWidth: (relevance) => Math.max(1, Math.min(8, relevance * 1.6)),
      gradientId: "stmt-strap-gradient",
      gradientStops: [
        { offset: "0%", stopColor: "#111827", stopOpacity: 0.22 },
        { offset: "100%", stopColor: "#374151", stopOpacity: 0.22 },
      ],
      midpointContent: React.createElement("div", {
        className: "w-2 h-2 rounded-full",
        style: { backgroundColor: "#6b7280" },
      }),
      useStrap: true,
      useBezier: false,
    },
    behavior: {
      showRelevanceInContextMenu: false,
      interactionWidth: 24,
      simplifyDuringDrag: false,
    },
  },
};
