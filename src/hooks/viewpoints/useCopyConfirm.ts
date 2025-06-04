"use client";

import { useState, useCallback } from "react";

export interface UseCopyConfirm {
  isCopying: boolean;
  isPageCopyConfirmOpen: boolean;
  setIsPageCopyConfirmOpen: (open: boolean) => void;
  handleCopy: (publishCopy?: boolean) => Promise<void>;
}

/**
 * Hook to manage page-copy confirmation dialog and perform copy action.
 */
export function useCopyConfirm(
  copyHandler: (publishCopy?: boolean) => Promise<void>
): UseCopyConfirm {
  const [isCopying, setIsCopying] = useState(false);
  const [isPageCopyConfirmOpen, setIsPageCopyConfirmOpen] = useState(false);

  const handleCopy = useCallback(
    async (publishCopy: boolean = true) => {
      setIsCopying(true);
      try {
        await copyHandler(publishCopy);
      } finally {
        setIsCopying(false);
      }
    },
    [copyHandler]
  );

  return {
    isCopying,
    isPageCopyConfirmOpen,
    setIsPageCopyConfirmOpen,
    handleCopy,
  };
}
