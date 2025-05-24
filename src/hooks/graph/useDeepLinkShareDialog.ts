import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

export const useDeepLinkShareDialog = () => {
  const searchParams = useSearchParams();
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareDialogMode, setShareDialogMode] = useState<"share" | "view">(
    "share"
  );
  const [sharedPoints, setSharedPoints] = useState<number[]>([]);
  const [sharedByUsername, setSharedByUsername] = useState<string | undefined>(
    undefined
  );

  useEffect(() => {
    const viewParam = searchParams?.get("view");
    const pointsParam = searchParams?.get("points");
    const byParam = searchParams?.get("by");

    if (viewParam === "shared" && pointsParam) {
      const pointIds = pointsParam
        .split(",")
        .map(Number)
        .filter((id) => !isNaN(id));
      if (pointIds.length > 0) {
        setSharedPoints(pointIds);
        setSharedByUsername(byParam ?? undefined);
        setShareDialogMode("view");
        setIsShareDialogOpen(true);
        return;
      }
    }

    setShareDialogMode("share");
  }, [searchParams]);

  return {
    isShareDialogOpen,
    setIsShareDialogOpen,
    shareDialogMode,
    sharedPoints,
    sharedByUsername,
  };
};
