"use client";

import { useState, useCallback } from "react";import { logger } from "@/lib/logger";

/**
 * Hook to copy a URL to clipboard and manage loading state.
 */
export function useCopyUrl() {
  const [isCopyingUrl, setIsCopyingUrl] = useState(false);

  const handleCopyUrl = useCallback(async (customUrl?: string) => {
    try {
      // Ensure URL is always a string
      const url = String(customUrl || window.location.href);
      await navigator.clipboard.writeText(url);
      setIsCopyingUrl(true);
      setTimeout(() => setIsCopyingUrl(false), 2000);
    } catch (error) {
      logger.error("Failed to copy URL:", error);
      // Fallback method - also ensure string conversion
      const fallbackUrl = String(customUrl || window.location.href);
      const textArea = document.createElement("textarea");
      textArea.value = fallbackUrl;
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
