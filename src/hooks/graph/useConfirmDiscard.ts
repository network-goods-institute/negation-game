"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

/**
 * Hook to manage unsaved-changes confirmation on back navigation.
 */
export function useConfirmDiscard(
  basePath: string,
  isGraphModified: boolean,
  isContentModified: boolean,
  resetContent: () => void
) {
  const router = useRouter();
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);

  const handleBackClick = useCallback(() => {
    if (isGraphModified || isContentModified) {
      setIsDiscardDialogOpen(true);
    } else {
      const target = basePath && basePath.startsWith("/s/") ? basePath : "/";
      router.push(target);
    }
  }, [isGraphModified, isContentModified, basePath, router]);

  const handleDiscard = useCallback(() => {
    resetContent();
    setIsDiscardDialogOpen(false);
    const target = basePath && basePath.startsWith("/s/") ? basePath : "/";
    router.push(target);
  }, [resetContent, basePath, router]);

  return {
    isDiscardDialogOpen,
    setIsDiscardDialogOpen,
    handleBackClick,
    handleDiscard,
  };
}
