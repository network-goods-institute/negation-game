export type FlowType = "distill" | "generate" | "create_rationale";

export interface FlowParams {
  flowType: FlowType;
  rationaleId?: string | null;
  description?: string;
  linkUrl?: string;
}

import { SavedChat, ViewpointGraph } from "@/types/chat";

/**
 * Determine which flow to use based on saved chat flags or an existing graph.
 */
export function determineFlowParams(
  savedChat?: SavedChat,
  currentGraph?: ViewpointGraph | null
): FlowParams {
  if (savedChat?.distillRationaleId) {
    return { flowType: "distill", rationaleId: savedChat.distillRationaleId };
  }
  if (currentGraph) {
    return {
      flowType: "create_rationale",
      description: currentGraph.description,
      linkUrl: currentGraph.linkUrl,
    };
  }
  return { flowType: "generate" };
}

/**
 * Map user-facing chat option IDs to normalized FlowType values.
 */
export function mapOptionToFlowType(
  optionId: "distill" | "build" | "generate" | "create_rationale"
): FlowType {
  if (optionId === "distill") return "distill";
  if (optionId === "create_rationale") return "create_rationale";
  return "generate";
}
