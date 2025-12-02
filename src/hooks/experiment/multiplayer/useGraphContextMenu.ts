import React from "react";
import { useReactFlow } from "@xyflow/react";

interface UseGraphContextMenuProps {
  graph: any;
}

export const useGraphContextMenu = ({ graph }: UseGraphContextMenuProps) => {
  const rf = useReactFlow();
  const [multiSelectMenuOpen, setMultiSelectMenuOpen] = React.useState(false);
  const [multiSelectMenuPos, setMultiSelectMenuPos] = React.useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });
  const [contextMenuNodeId, setContextMenuNodeId] = React.useState<
    string | null
  >(null);
  const [contextMenuTargetIds, setContextMenuTargetIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (multiSelectMenuOpen) return;
    setContextMenuTargetIds([]);
    setContextMenuNodeId(null);
  }, [multiSelectMenuOpen]);

  const buildPositionsById = React.useCallback(
    (ids: string[]) => {
      return ids.reduce<
        Record<string, { x: number; y: number; width: number; height: number }>
      >((acc, nid) => {
        const node = rf.getNode(nid) as any;
        const x = Number.isFinite(node?.position?.x) ? node.position.x : 0;
        const y = Number.isFinite(node?.position?.y) ? node.position.y : 0;

        let width =
          Number(
            node?.width ?? node?.measured?.width ?? node?.style?.width ?? 0
          ) || 0;
        let height =
          Number(
            node?.height ?? node?.measured?.height ?? node?.style?.height ?? 0
          ) || 0;

        if ((!width || !height) && typeof document !== "undefined") {
          try {
            const selector = `.react-flow__node[data-id="${nid}"]`;
            const el = document.querySelector(selector) as HTMLElement | null;
            if (el) {
              const rect = el.getBoundingClientRect();
              if (!width) width = Math.ceil(rect.width);
              if (!height) height = Math.ceil(rect.height);
            }
          } catch {}
        }

        if (!width) width = 240;
        if (!height) height = 80;

        acc[nid] = { x, y, width, height };
        return acc;
      }, {});
    },
    [rf]
  );

  const handleMultiSelectContextMenu = React.useCallback(
    (e: React.MouseEvent) => {
      // Check if we're clicking on a node
      const target = e.target as HTMLElement;

      // Safety check for DOM methods
      if (!target || typeof target.closest !== "function") {
        return;
      }

      const editableEl = target.closest('[contenteditable="true"]') as HTMLElement | null;
      const interactiveEl = target.closest("input, textarea, select, button") as HTMLElement | null;
      if (editableEl && editableEl.contentEditable === "true") {
        return;
      }
      if (interactiveEl && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/i.test(interactiveEl.tagName || "")) {
        return;
      }

      const nodeElement = target.closest(".react-flow__node");

      if (nodeElement) {
        e.preventDefault();
        e.stopPropagation();

        // Get the node ID from the data-id attribute
        const nodeId = nodeElement.getAttribute("data-id");
        if (nodeId) {
          setContextMenuNodeId(nodeId);
          const clickedNode = rf.getNode(nodeId);
          const selectedNodes = rf
            .getNodes()
            .filter((n) => (n as any).selected);
          const targetNodes =
            clickedNode && !(clickedNode as any).selected
              ? [clickedNode]
              : selectedNodes.length > 0
                ? selectedNodes
                : clickedNode
                  ? [clickedNode]
                  : [];
          setContextMenuTargetIds(targetNodes.map((n) => n.id));

          // If the clicked node is not selected, select it (and deselect others if not multi-selecting)
          if (clickedNode && !(clickedNode as any).selected) {
            // Deselect all other nodes and select only the clicked one
            const changes = rf.getNodes().map((n) => ({
              id: n.id,
              type: "select" as const,
              selected: n.id === nodeId,
            }));
            // Apply the selection changes through the graph's node change handler
            // This is a bit of a hack - we're modifying selection state directly
            // A better approach would be to use the graph context's selection methods
            graph.clearNodeSelection?.();
            setTimeout(() => {
              rf.setNodes((nodes) =>
                nodes.map((n) => ({
                  ...n,
                  selected: n.id === nodeId,
                }))
              );
            }, 0);
          }
        } else {
          setContextMenuTargetIds([]);
        }

        setMultiSelectMenuPos({ x: e.clientX, y: e.clientY });
        setMultiSelectMenuOpen(true);
      }
    },
    [rf, graph]
  );

  const handleDeleteSelectedNodes = React.useCallback(() => {
    const nodes = rf.getNodes();
    const selectionById = nodes.reduce<Record<string, any>>((acc, node) => {
      acc[node.id] = node;
      return acc;
    }, {});
    const targets = contextMenuTargetIds
      .map((id) => selectionById[id])
      .filter(Boolean);
    const selectedNodes = nodes.filter((n) => (n as any).selected);
    const effectiveTargets =
      targets.length > 0
        ? targets
        : selectedNodes.length > 0
          ? selectedNodes
          : contextMenuNodeId && selectionById[contextMenuNodeId]
            ? [selectionById[contextMenuNodeId]]
            : [];

    if (effectiveTargets.length === 0) {
      setMultiSelectMenuOpen(false);
      return;
    }

    effectiveTargets.forEach((n) => graph.deleteNode?.(n.id));
    setMultiSelectMenuOpen(false);
  }, [rf, graph, contextMenuTargetIds, contextMenuNodeId]);

  const handleAddPointToSelected = React.useCallback(() => {
    const nodes = rf.getNodes();
    const selectionById = nodes.reduce<Record<string, any>>((acc, node) => {
      acc[node.id] = node;
      return acc;
    }, {});
    const contextTargets = contextMenuTargetIds
      .map((id) => selectionById[id])
      .filter(Boolean);
    const selectedNodes = nodes.filter((n) => (n as any).selected);
    const sel =
      contextTargets.length > 0
        ? contextTargets
        : selectedNodes.length > 0
          ? selectedNodes
          : contextMenuNodeId && selectionById[contextMenuNodeId]
            ? [selectionById[contextMenuNodeId]]
            : [];
    const contextNode = contextMenuNodeId
      ? rf.getNode(contextMenuNodeId)
      : null;
    const contextType = (contextNode as any)?.type;
    const wantsComment = contextType === "comment";

    const eligibleNodes = sel.filter((n) => {
      const type = (n as any).type;
      return (
        type === "point" ||
        type === "objection" ||
        type === "statement" ||
        type === "comment"
      );
    });

    if (eligibleNodes.length > 0) {
      const nodeIds = eligibleNodes.map((n) => n.id);
      const positionsById = buildPositionsById(nodeIds);
      const result = graph.addPointBelow?.({ ids: nodeIds, positionsById });
      if (wantsComment && result) {
        const newNodeId =
          typeof result === "string" ? result : (result as any)?.nodeId;
        if (newNodeId) {
          graph.updateNodeType?.(newNodeId, "comment");
          graph.startEditingNode?.(newNodeId);
        }
      }
    }
    setMultiSelectMenuOpen(false);
  }, [rf, graph, buildPositionsById, contextMenuNodeId, contextMenuTargetIds]);

  const getAddPointLabel = React.useCallback(() => {
    // Use the right-clicked node to determine the label immediately
    const contextNode = contextMenuNodeId
      ? rf.getNode(contextMenuNodeId)
      : null;

    if (!contextNode) return "Add Point";

    const contextType = (contextNode as any).type;

    // No count shown - just the action label
    if (contextType === "statement") return "Add Option";
    if (contextType === "comment") return "Reply";
    return "Add Point";
  }, [rf, contextMenuNodeId]);

  return {
    multiSelectMenuOpen,
    multiSelectMenuPos,
    handleMultiSelectContextMenu,
    handleDeleteSelectedNodes,
    handleAddPointToSelected,
    getAddPointLabel,
    setMultiSelectMenuOpen,
  };
};
