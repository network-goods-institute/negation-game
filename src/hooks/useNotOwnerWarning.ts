import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function useNotOwnerWarning(
  isModified: boolean,
  canModify: boolean | undefined,
  onCopy: () => void
) {
  const hasShownRef = useRef(false);
  const toastIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    if (isModified && !canModify && !hasShownRef.current) {
      toastIdRef.current = toast.warning(
        "Not saving, just playing. To keep your changes:",
        {
          position: "bottom-center",
          duration: Infinity,
          action: {
            label: "Make a Copy",
            onClick: onCopy,
          },
          actionButtonStyle: {
            backgroundColor: "hsl(var(--primary))",
            color: "hsl(var(--primary-foreground))",
          },
        }
      );
      hasShownRef.current = true;
    } else if (!isModified && hasShownRef.current) {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }
      hasShownRef.current = false;
      toastIdRef.current = null;
    }
  }, [isModified, canModify, onCopy]);

  useEffect(() => {
    return () => {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }
    };
  }, []);
}
