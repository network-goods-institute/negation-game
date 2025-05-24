"use client";

import { useState, useCallback } from "react";

/**
 * Hook to copy the current URL to clipboard and manage loading state.
 */
export function useCopyUrl() {
  const [isCopyingUrl, setIsCopyingUrl] = useState(false);

  const handleCopyUrl = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setIsCopyingUrl(true);
    setTimeout(() => setIsCopyingUrl(false), 2000);
  }, []);

  return { isCopyingUrl, handleCopyUrl };
}
