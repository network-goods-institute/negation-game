"use client";

import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useToggle } from "@uidotdev/usehooks";
import { useEffect } from "react";

export const ToggleableReactQueryDevTools = () => {
  const [showReactQueryDevTools, toggleShowReactQueryDevTools] =
    useToggle(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "o" || e.key === "ø") && e.metaKey && e.altKey) {
        toggleShowReactQueryDevTools();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [toggleShowReactQueryDevTools]);

  return (
    <>
      {showReactQueryDevTools && (
        <ReactQueryDevtools initialIsOpen={true} buttonPosition="top-left" />
      )}
    </>
  );
};
