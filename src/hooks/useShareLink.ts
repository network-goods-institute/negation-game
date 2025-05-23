"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useAtom } from "jotai";
import { selectedPointIdsAtom } from "@/atoms/viewpointAtoms";

export interface UseShareLink {
  isSharing: boolean;
  selectedPointIds: Set<number>;
  setSelectedPointIds: (ids: Set<number>) => void;
  toggleSharingMode: () => void;
  handleGenerateAndCopyShareLink: () => void;
}

/* eslint-disable drizzle/enforce-delete-with-where*/

/**
 * Hook to manage share link generation and copying for selected points.
 */
export function useShareLink(userName?: string): UseShareLink {
  const [isSharing, setIsSharing] = useState(false);
  const [selectedPointIds, setSelectedPointIds] = useAtom(selectedPointIdsAtom);

  const toggleSharingMode = useCallback(() => {
    const next = !isSharing;
    setIsSharing(next);
    if (!next) {
      setSelectedPointIds(new Set());
    }
  }, [isSharing, setSelectedPointIds]);

  const handleGenerateAndCopyShareLink = useCallback(() => {
    if (selectedPointIds.size === 0) {
      toast.info("Select some points first to generate a share link.");
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("view");
    url.searchParams.delete("points");
    url.searchParams.delete("by");
    url.searchParams.set("view", "shared");
    url.searchParams.set("points", Array.from(selectedPointIds).join(","));
    if (userName) {
      url.searchParams.set("by", userName);
    }
    const link = url.toString();
    navigator.clipboard
      .writeText(link)
      .then(() => {
        toast.success(
          `Share link copied for ${selectedPointIds.size} point(s)!`
        );
        setIsSharing(false);
        setSelectedPointIds(new Set());
      })
      .catch(() => {
        toast.error("Failed to copy link. Please try again.");
      });
  }, [selectedPointIds, userName, setSelectedPointIds]);

  return {
    isSharing,
    selectedPointIds,
    setSelectedPointIds,
    toggleSharingMode,
    handleGenerateAndCopyShareLink,
  };
}
