import React from "react";

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
      midpointContent: React.createElement(
        "div",
        {
          className: "font-bold flex items-center justify-center",
          style: {
            color: "#9CA3AF",
            fontSize: "28px",
            lineHeight: "1",
            transform: "translateY(-1px)",
          },
        },
        "-"
      ),
      useStrap: true,
      useBezier: false,
    },
    behavior: {
      showRelevanceInContextMenu: true,
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
      strokeDasharray: "8,4", // Optional, determined by edgeIsObjectionStyle
      midpointContent: React.createElement("div", {
        className: "w-2 h-[2px] rounded-sm",
        style: { backgroundColor: "#f97316", transform: "rotate(45deg)" },
      }),
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
        "div",
        {
          className: "text-[8px] font-bold",
          style: { color: "#2563eb" },
        },
        "?"
      ),
      useStrap: true,
      useBezier: false,
    },
    behavior: {
      showRelevanceInContextMenu: true,
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
      midpointContent: React.createElement(
        "div",
        {
          className: "font-bold flex items-center justify-center",
          style: {
            color: "#9CA3AF",
            fontSize: "19px",
            lineHeight: "1",
            transform: "translateY(-1px)",
          },
        },
        "+"
      ),
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
      starColor: "text-blue-600",
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
      showRelevanceInContextMenu: true,
      interactionWidth: 24,
      simplifyDuringDrag: false,
    },
  },
};
