"use client";

import { DEFAULT_SPACE } from "@/constants/config";
import { useEffect } from "react";

type SpaceData = {
  id: string;
  icon?: string | null;
};

export function SpaceHeader({ spaceData }: { spaceData?: SpaceData | null }) {
  useEffect(() => {
    // Skip DOM manipulations during SSR
    if (typeof window === 'undefined') return;

    // Return early if spaceData is null, undefined, or default space
    if (!spaceData || spaceData.id === DEFAULT_SPACE) {
      return;
    }

    // Get the original logo and container
    const headerLogo = document.getElementById('header-logo');
    const headerContainer = document.getElementById('header-container');
    const spaceHeader = document.getElementById('space-header');

    // Return early if any required DOM element is not found
    if (!headerLogo || !headerContainer || !spaceHeader) {
      return;
    }

    try {
      // Create a wrapper link for everything
      const wrapperLink = document.createElement('a');
      wrapperLink.href = `/s/${spaceData.id}`;
      wrapperLink.className = 'flex items-center';

      // Clone the content of the header logo
      const logoClone = headerLogo.cloneNode(true) as HTMLElement;
      logoClone.removeAttribute('id');
      // Remove the href attribute as we're already wrapping in a link
      if (logoClone instanceof HTMLAnchorElement) {
        logoClone.removeAttribute('href');
      }

      // Remove the original link functionality to avoid nested links
      headerLogo.style.display = 'none';

      // Create the space part
      const spaceSeparator = document.createElement('span');
      spaceSeparator.className = 'text-muted-foreground mx-1';
      spaceSeparator.textContent = '×';

      const spaceInfo = document.createElement('div');
      spaceInfo.className = 'flex items-center';

      const iconContainer = document.createElement('div');
      iconContainer.className = 'relative w-6 h-6 border-2 border-background rounded-full overflow-hidden mr-1';

      if (spaceData.icon) {
        const img = document.createElement('img');
        img.src = spaceData.icon;
        img.alt = `s/${spaceData.id} icon`;
        img.className = 'w-full h-full object-cover';
        iconContainer.appendChild(img);
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'w-full h-full flex items-center justify-center bg-muted text-sm font-bold text-muted-foreground';
        placeholder.textContent = spaceData.id.charAt(0).toUpperCase();
        iconContainer.appendChild(placeholder);
      }

      const spaceName = document.createElement('span');
      spaceName.className = 'font-semibold';
      spaceName.textContent = `s/${spaceData.id}`;

      spaceInfo.appendChild(iconContainer);
      spaceInfo.appendChild(spaceName);

      // Clear previous content
      spaceHeader.innerHTML = '';

      // Create new content
      const contentContainer = document.createElement('div');
      contentContainer.className = 'flex items-center';

      // Append the new elements
      wrapperLink.appendChild(logoClone);
      wrapperLink.appendChild(spaceSeparator);
      wrapperLink.appendChild(spaceInfo);

      // Replace the first child of the header container with our wrapper
      const firstChild = headerContainer.firstChild;
      if (firstChild) {
        headerContainer.replaceChild(wrapperLink, firstChild);
      } else {
        headerContainer.appendChild(wrapperLink);
      }
    } catch (error) {
      console.error("Error in SpaceHeader:", error);
    }

    // Clean up function
    return () => {
      // Skip cleanup if window is undefined (component unmounting during navigation)
      if (typeof window === 'undefined') return;

      try {
        const headerLogo = document.getElementById('header-logo');
        if (headerLogo) {
          headerLogo.style.display = '';
        }

        const spaceHeader = document.getElementById('space-header');
        if (spaceHeader) {
          spaceHeader.innerHTML = '';
        }

        // Restore the original header container structure
        const headerContainer = document.getElementById('header-container');
        if (headerContainer) {
          // Get all children of headerContainer
          const children = Array.from(headerContainer.children);
          // Find any wrapper links we created
          for (const child of children) {
            if (child instanceof HTMLAnchorElement && child.classList.contains('flex')) {
              // Replace with the original content structure
              const origContainer = document.createElement('div');
              origContainer.className = 'flex items-center';

              // Move the logo back
              const headerLogo = document.getElementById('header-logo');
              if (headerLogo) {
                origContainer.appendChild(headerLogo);
              } else {
                const newLogo = document.createElement('a');
                newLogo.id = 'header-logo';
                newLogo.href = '/';
                newLogo.className = 'font-bold';
                newLogo.textContent = 'Negation Game';
                origContainer.appendChild(newLogo);
              }

              // Add the space header container
              const spaceHeader = document.createElement('div');
              spaceHeader.id = 'space-header';
              spaceHeader.className = 'flex items-center ml-2';
              origContainer.appendChild(spaceHeader);

              // Replace the wrapper with the original structure
              headerContainer.replaceChild(origContainer, child);
              break;
            }
          }
        }
      } catch (error) {
        console.error("Error in SpaceHeader cleanup:", error);
      }
    };
  }, [spaceData]);

  // Return null unconditionally as the rendering happens in useEffect
  return null;
} 