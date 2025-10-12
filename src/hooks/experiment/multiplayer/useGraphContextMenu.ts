import React from 'react';
import { useReactFlow } from '@xyflow/react';

interface UseGraphContextMenuProps {
  graph: any;
}

export const useGraphContextMenu = ({ graph }: UseGraphContextMenuProps) => {
  const rf = useReactFlow();
  const [multiSelectMenuOpen, setMultiSelectMenuOpen] = React.useState(false);
  const [multiSelectMenuPos, setMultiSelectMenuPos] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMultiSelectContextMenu = React.useCallback((e: React.MouseEvent) => {
    const selectedNodes = rf.getNodes().filter((n) => (n as any).selected);
    if (selectedNodes.length > 1) {
      e.preventDefault();
      e.stopPropagation();
      setMultiSelectMenuPos({ x: e.clientX, y: e.clientY });
      setMultiSelectMenuOpen(true);
    }
  }, [rf]);

  const handleDeleteSelectedNodes = React.useCallback(() => {
    const sel = rf.getNodes().filter((n) => (n as any).selected);
    if (sel.length > 0) {
      const ids = new Set<string>();
      sel.forEach((n) => {
        const node: any = n as any;
        if (node.type === 'group') {
          ids.add(node.id);
          return;
        }
        const pid = node.parentId;
        if (pid) {
          const p = rf.getNode(pid) as any;
          if (p && p.type === 'group') {
            ids.add(p.id);
            return;
          }
        }
        ids.add(node.id);
      });
      ids.forEach((id) => graph.deleteNode?.(id));
    }
    setMultiSelectMenuOpen(false);
  }, [rf, graph]);

  return {
    multiSelectMenuOpen,
    multiSelectMenuPos,
    handleMultiSelectContextMenu,
    handleDeleteSelectedNodes,
    setMultiSelectMenuOpen,
  };
};
