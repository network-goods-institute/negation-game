"use client";

import { useState, useCallback } from "react";

export interface UseCopyConfirm {
  isCopying: boolean;
  isPageCopyConfirmOpen: boolean;
  setIsPageCopyConfirmOpen: (open: boolean) => void;
  handleCopy: () => Promise<void>;
}

/**
 * Hook to manage page-copy confirmation dialog and perform copy action.
 */
export function useCopyConfirm(
  copyHandler: () => Promise<void>
): UseCopyConfirm {
  const [isCopying, setIsCopying] = useState(false);
  const [isPageCopyConfirmOpen, setIsPageCopyConfirmOpen] = useState(false);

  const handleCopy = useCallback(async () => {
    setIsCopying(true);
    try {
      await copyHandler();
    } finally {
      setIsCopying(false);
    }
  }, [copyHandler]);

  return {
    isCopying,
    isPageCopyConfirmOpen,
    setIsPageCopyConfirmOpen,
    handleCopy,
  };
}
