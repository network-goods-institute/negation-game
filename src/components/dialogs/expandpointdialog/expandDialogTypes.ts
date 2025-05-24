import { atom } from "jotai";

export interface ExpandablePoint {
  pointId: number;
  parentId?: string | number;
  searchTerm: string;
  isMobile?: boolean;
  dialogPosition: { x: number; y: number };
  isVisited: boolean;
  onMarkAsRead: (pointId: number) => void;
  onZoomToNode: (pointId: number) => void;
}

export type ExpandDialogState = {
  isOpen: boolean;
  points: ExpandablePoint[];
  parentNodeId: string | null;
  onClose: (() => void) | null;
  onSelectPoint: ((point: ExpandablePoint) => void) | null;
};

export const expandDialogAtom = atom<ExpandDialogState>({
  isOpen: false,
  points: [],
  parentNodeId: null,
  onClose: null,
  onSelectPoint: null,
});
