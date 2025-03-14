"use client";

import { DEFAULT_SPACE } from "@/constants/config";
import { useEffect, useRef } from "react";

export function SpaceHeader({ spaceData }: { spaceData: any }) {
  const prevSpaceIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!spaceData || spaceData.id === DEFAULT_SPACE) return;

    // Skip if same space as before to prevent re-renders
    if (prevSpaceIdRef.current === spaceData.id) return;

    prevSpaceIdRef.current = spaceData.id;

    const targetContainer = document.getElementById('space-header');
    if (!targetContainer) return;

    targetContainer.innerHTML = `
          <span class="text-muted-foreground mx-1">×</span>
          <a href="/s/${spaceData.id}" class="flex items-center hover:opacity-80">
            <div class="relative w-6 h-6 border-2 border-background rounded-full overflow-hidden mr-1">
              ${spaceData.icon ?
        `<img src="${spaceData.icon}" alt="s/${spaceData.id} icon" class="w-full h-full object-cover" />` :
        `<div class="w-full h-full flex items-center justify-center bg-muted text-sm font-bold text-muted-foreground">
                  ${spaceData.id.charAt(0).toUpperCase()}
                </div>`
      }
            </div>
            <span class="font-semibold">s/${spaceData.id}</span>
          </a>
        `;

    return () => {
      if (prevSpaceIdRef.current === spaceData.id && targetContainer) {
        targetContainer.innerHTML = '';
      }
    };
  }, [spaceData?.id]);
  return null;
} 