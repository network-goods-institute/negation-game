"use client";

import { useState, useCallback } from "react";

/**
 * Hook to copy a URL to clipboard and manage loading state.
 */
export function useCopyUrl() {
  const [isCopyingUrl, setIsCopyingUrl] = useState(false);

  const handleCopyUrl = useCallback(async (customUrl?: string) => {
    try {
      const url = customUrl || window.location.href;
      await navigator.clipboard.writeText(url);
      setIsCopyingUrl(true);
      setTimeout(() => setIsCopyingUrl(false), 2000);
    } catch (error) {
      console.error("Failed to copy URL:", error);
      const textArea = document.createElement("textarea");
      textArea.value = customUrl || window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setIsCopyingUrl(true);
      setTimeout(() => setIsCopyingUrl(false), 2000);
    }
  }, []);

  return { isCopyingUrl, handleCopyUrl };
}
