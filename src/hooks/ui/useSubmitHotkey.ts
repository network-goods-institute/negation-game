import { useEffect, useRef } from "react";

export const useSubmitHotkey = (
  onSubmit: () => void,
  enabled: boolean = true
) => {
  // Keep a ref to the latest onSubmit so we can register the listener once
  const onSubmitRef = useRef(onSubmit);

  // Update ref whenever onSubmit changes
  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!enabled) return;

      // Check for CMD/Ctrl + Enter
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        onSubmitRef.current();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled]);
};
