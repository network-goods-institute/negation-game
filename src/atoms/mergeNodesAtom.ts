import { atom } from "jotai";

export interface DuplicatePointNode {
  id: string;
  pointId: number;
  parentIds: (string | number)[];
}

export interface MergeNodesDialogState {
  isOpen: boolean;
  pointId: number;
  duplicateNodes: DuplicatePointNode[];
  onClose?: () => void;
}

export const mergeNodesDialogAtom = atom<MergeNodesDialogState>({
  isOpen: false,
  pointId: 0,
  duplicateNodes: [],
  onClose: undefined,
});
