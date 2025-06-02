import { atom } from "jotai";

export interface ConnectNodesDialogState {
  isOpen: boolean;
  sourceId: string;
  targetId: string;
  onClose?: () => void;
}

export const connectNodesDialogAtom = atom<ConnectNodesDialogState>({
  isOpen: false,
  sourceId: "",
  targetId: "",
  onClose: undefined,
});
