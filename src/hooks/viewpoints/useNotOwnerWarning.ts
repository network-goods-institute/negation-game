import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

export function useNotOwnerWarning(
  isModified: boolean,
  canModify: boolean | undefined,
  onCopy: () => void
) {
  const searchParams = useSearchParams();
  const embedParam = searchParams.get("embed");
  const isEmbedMode =
    embedParam === "mobile" ||
    embedParam === "embed" ||
    embedParam === "desktop";
  const hasShownRef = useRef(false);
  const toastIdRef = useRef<string | number | null>(null);
  const mountTimeRef = useRef<number>(Date.now());
  const delayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (delayTimeoutRef.current) {
      clearTimeout(delayTimeoutRef.current);
      delayTimeoutRef.current = null;
    }

    if (
      isModified &&
      canModify === false &&
      !hasShownRef.current &&
      !isEmbedMode
    ) {
      const showWarning = () => {
        toastIdRef.current = toast.warning(
          "Not saving, just playing. To keep your changes:",
          {
            position: "bottom-center",
            duration: Infinity,
            action: { label: "Make a Copy", onClick: onCopy },
            actionButtonStyle: {
              backgroundColor: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
            },
          }
        );
        hasShownRef.current = true;
      };

      const elapsed = Date.now() - mountTimeRef.current;
      const remaining = Math.max(0, 5000 - elapsed);
      if (remaining === 0) {
        showWarning();
      } else {
        delayTimeoutRef.current = setTimeout(showWarning, remaining);
      }
    } else if (!isModified && hasShownRef.current) {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }
      hasShownRef.current = false;
      toastIdRef.current = null;
    }

    return () => {
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
        delayTimeoutRef.current = null;
      }
    };
  }, [isModified, canModify, onCopy, isEmbedMode]);

  useEffect(() => {
    return () => {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }
    };
  }, []);
}
