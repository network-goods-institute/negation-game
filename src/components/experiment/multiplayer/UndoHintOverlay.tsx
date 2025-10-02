import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface UndoHintOverlayProps {
  position: { x: number; y: number } | null;
  onDismiss: () => void;
}

export const UndoHintOverlay: React.FC<UndoHintOverlayProps> = ({ position, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (position) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss();
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [position]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!position || !isVisible) return null;

  const { x, y } = position;
  const mount = typeof document !== 'undefined' ? document.querySelector('.react-flow__viewport') : null;
  if (!mount) return null;

  return createPortal(
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: "translate(-50%, -100%)",
        pointerEvents: "none",
      }}
    >
      <div className="bg-primary text-primary-foreground px-3 py-1 rounded shadow-sm text-sm min-w-[110px] text-center">
        {navigator.platform.includes("Mac") ? "⌘ + Z to undo" : "Ctrl + Z to undo"}
      </div>
    </div>,
    mount
  );
};
