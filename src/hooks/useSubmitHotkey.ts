import { useCallback, useEffect } from "react";

export const useSubmitHotkey = (
  onSubmit: () => void,
  enabled: boolean = true,
) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Check for CMD/Ctrl + Enter
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        onSubmit();
      }
    },
    [onSubmit, enabled],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
};
