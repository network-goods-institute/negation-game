import React from "react";
import { useReactFlow } from "@xyflow/react";
import { toast } from "sonner";

interface UseGraphKeyboardHandlersProps {
  graph: any;
  copiedNodeIdRef: React.MutableRefObject<string | null>;
}

export const useGraphKeyboardHandlers = ({
  graph,
  copiedNodeIdRef,
}: UseGraphKeyboardHandlersProps) => {
  const rf = useReactFlow();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const target = e.target as HTMLElement | null;
      const active = (document.activeElement as HTMLElement | null) || null;
      const isEditable = (el: HTMLElement | null) => {
        if (!el) return false;
        const tag = el.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return true;
        if (el.isContentEditable) return true;
        return false;
      };
      if (isEditable(target) || isEditable(active)) return;

      const selection = window.getSelection?.();
      if (selection && !selection.isCollapsed) return;

      const isDeleteKey = key === "delete" || key === "backspace";
      if (isDeleteKey) {
        // Block deletions while any node is in edit mode
        if (graph?.isAnyNodeEditing) {
          e.preventDefault();
          return;
        }
        const sel = rf.getNodes().filter((n) => (n as any).selected);
        const selectedEdgeId = graph?.selectedEdgeId as string | null;
        const hoveredEdgeId = graph?.hoveredEdgeId as string | null;
        const edgeIdToDelete = selectedEdgeId || hoveredEdgeId || null;
        if (edgeIdToDelete) {
          e.preventDefault();
          graph.deleteNode?.(edgeIdToDelete);
          graph.setSelectedEdge?.(null);
          try {
            graph.setHoveredEdge?.(null);
          } catch {}
          return;
        }
        if (sel.length > 0) {
          e.preventDefault();
          const ids = new Set<string>();
          sel.forEach((n) => {
            const node: any = n as any;
            if (node.type === "group") {
              ids.add(node.id);
              return;
            }
            const pid = node.parentId;
            if (pid) {
              const p = rf.getNode(pid) as any;
              if (p && p.type === "group") {
                ids.add(p.id);
                return;
              }
            }
            ids.add(node.id);
          });
          ids.forEach((id) => graph.deleteNode?.(id));
          return;
        }
        // Nothing selected: prevent browser navigation on Backspace/Delete
        e.preventDefault();
        return;
      }
      if (key === "escape") {
        try {
          graph?.cancelMindchangeSelection?.();
        } catch {}
        try {
          graph?.cancelConnect?.();
        } catch {}
        try {
          graph?.clearNodeSelection?.();
        } catch {}
        try {
          graph?.setSelectedEdge?.(null);
        } catch {}
        e.preventDefault();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && key === "c") {
        const sel = rf.getNodes().filter((n) => (n as any).selected);
        if (sel.length === 1) {
          const only = sel[0] as any;
          if (only && String(only.type) !== "edge_anchor") {
            copiedNodeIdRef.current = String(only.id);
            e.preventDefault();
            e.stopPropagation();
            try {
              toast.success("Copied node");
            } catch {}
            return;
          }
        }
      }
      if ((e.metaKey || e.ctrlKey) && key === "v") {
        const targetId = copiedNodeIdRef.current;
        if (targetId) {
          const targetNode: any = rf.getNode(targetId as any);
          const exists = !!targetNode;
          const duplicable =
            exists && String(targetNode?.type) !== "edge_anchor";
          if (duplicable) {
            e.preventDefault();
            e.stopPropagation();
            try {
              graph?.duplicateNodeWithConnections?.(targetId, { x: 16, y: 16 });
            } catch {}
            return;
          }
        }
      }
    };

    window.addEventListener("keydown", onKey, { capture: true });
    return () => {
      window.removeEventListener(
        "keydown",
        onKey as any,
        { capture: true } as any
      );
    };
  }, [rf, graph, copiedNodeIdRef]);
};
