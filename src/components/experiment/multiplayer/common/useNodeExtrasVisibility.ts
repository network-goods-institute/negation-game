import React from "react";
import { useStore } from "@xyflow/react";

type Params = {
  id: string;
  selected: boolean;
  isEditing: boolean;
  isConnectMode: boolean;
  contentRef: React.RefObject<HTMLElement | null>;
  interactiveSelector: string;
  wrapperRef?: React.RefObject<HTMLElement | null>;
};

export const useNodeExtrasVisibility = ({
  id,
  selected,
  isEditing,
  isConnectMode,
  contentRef,
  interactiveSelector,
  wrapperRef,
}: Params) => {
  const [suppressExtras, setSuppressExtras] = React.useState(false);
  const suppressCleanupRef = React.useRef<(() => void) | null>(null);
  const extrasElementsRef = React.useRef<Set<HTMLElement>>(new Set());

  const isDragging = useStore((s: any) => {
    try {
      const fromInternals = s.nodeInternals?.get?.(id);
      if (fromInternals && typeof fromInternals === "object") {
        return Boolean((fromInternals as any).dragging);
      }
      const nodesArr = Array.isArray(s.nodes)
        ? s.nodes
        : Array.from(s.nodes?.values?.() || []);
      const self = nodesArr.find((n: any) => String(n?.id) === String(id));
      return Boolean(self?.dragging);
    } catch {
      return false;
    }
  });

  const bindSuppressUntilPointerUp = React.useCallback(() => {
    setSuppressExtras(true);
    const off = () => {
      setSuppressExtras(false);
      try {
        extrasElementsRef.current.forEach((el) => {
          el.style.visibility = "";
        });
      } catch {}
      try {
        window.removeEventListener("mouseup", off as any);
      } catch {}
      try {
        window.removeEventListener("touchend", off as any);
      } catch {}
    };
    suppressCleanupRef.current = off;
    window.addEventListener("mouseup", off as any, { once: true } as any);
    window.addEventListener("touchend", off as any, { once: true } as any);
  }, []);

  React.useEffect(() => {
    return () => {
      try {
        suppressCleanupRef.current?.();
      } catch {}
    };
  }, []);

  const shouldBindForEvent = (targetEl: HTMLElement | null) => {
    if (isConnectMode || isEditing) return false;
    if (targetEl?.closest(interactiveSelector)) return false;
    if (contentRef.current && targetEl && contentRef.current.contains(targetEl))
      return true;
    return true;
  };

  const onWrapperMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    if (!shouldBindForEvent(target)) return;
    try {
      extrasElementsRef.current.forEach((el) => {
        el.style.visibility = "hidden";
      });
      (wrapperRef?.current as any)?.setAttribute?.("data-pressing", "true");
    } catch {}
    bindSuppressUntilPointerUp();
    const clear = () => {
      try {
        (wrapperRef?.current as any)?.removeAttribute?.("data-pressing");
      } catch {}
      try {
        window.removeEventListener("mouseup", clear as any);
      } catch {}
      try {
        window.removeEventListener("touchend", clear as any);
      } catch {}
    };
    window.addEventListener("mouseup", clear as any, { once: true } as any);
    window.addEventListener("touchend", clear as any, { once: true } as any);
  };

  const onWrapperTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    if (!shouldBindForEvent(target)) return;
    try {
      extrasElementsRef.current.forEach((el) => {
        el.style.visibility = "hidden";
      });
      (wrapperRef?.current as any)?.setAttribute?.("data-pressing", "true");
    } catch {}
    bindSuppressUntilPointerUp();
    const clear = () => {
      try {
        (wrapperRef?.current as any)?.removeAttribute?.("data-pressing");
      } catch {}
      try {
        window.removeEventListener("mouseup", clear as any);
      } catch {}
      try {
        window.removeEventListener("touchend", clear as any);
      } catch {}
    };
    window.addEventListener("mouseup", clear as any, { once: true } as any);
    window.addEventListener("touchend", clear as any, { once: true } as any);
  };

  const onContentMouseDown = (_e: React.MouseEvent<HTMLDivElement>) => {
    if (isEditing) return;
    try {
      extrasElementsRef.current.forEach((el) => {
        el.style.visibility = "hidden";
      });
      (wrapperRef?.current as any)?.setAttribute?.("data-pressing", "true");
    } catch {}
    bindSuppressUntilPointerUp();
    const clear = () => {
      try {
        (wrapperRef?.current as any)?.removeAttribute?.("data-pressing");
      } catch {}
      try {
        window.removeEventListener("mouseup", clear as any);
      } catch {}
      try {
        window.removeEventListener("touchend", clear as any);
      } catch {}
    };
    window.addEventListener("mouseup", clear as any, { once: true } as any);
    window.addEventListener("touchend", clear as any, { once: true } as any);
  };

  const onContentTouchStart = (_e: React.TouchEvent<HTMLDivElement>) => {
    if (isEditing) return;
    try {
      extrasElementsRef.current.forEach((el) => {
        el.style.visibility = "hidden";
      });
      (wrapperRef?.current as any)?.setAttribute?.("data-pressing", "true");
    } catch {}
    bindSuppressUntilPointerUp();
    const clear = () => {
      try {
        (wrapperRef?.current as any)?.removeAttribute?.("data-pressing");
      } catch {}
      try {
        window.removeEventListener("mouseup", clear as any);
      } catch {}
      try {
        window.removeEventListener("touchend", clear as any);
      } catch {}
    };
    window.addEventListener("mouseup", clear as any, { once: true } as any);
    window.addEventListener("touchend", clear as any, { once: true } as any);
  };

  const showExtras = isEditing || (!isDragging && !suppressExtras);

  return {
    isDragging,
    showExtras,
    onWrapperMouseDown,
    onWrapperTouchStart,
    onContentMouseDown,
    onContentTouchStart,
    registerExtras: (el: HTMLElement | null) => {
      if (!el) return;
      extrasElementsRef.current.add(el);
    },
  };
};
