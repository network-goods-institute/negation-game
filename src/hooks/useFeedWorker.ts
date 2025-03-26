import { useEffect, useRef } from "react";
import { useSetPointData } from "@/queries/usePointData";
import { useQueryClient } from "@tanstack/react-query";

export const useFeedWorker = () => {
  const workerRef = useRef<Worker | null>(null);
  const setPointData = useSetPointData();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Create worker
    workerRef.current = new Worker(
      new URL("../workers/feedProcessor.ts", import.meta.url),
      {
        type: "module",
      }
    );

    // Set up message handler
    workerRef.current.onmessage = (e) => {
      if (e.data.type === "BATCH_PROCESSED") {
        const { points, userId, batchIndex, totalBatches } = e.data;

        // Process all points in the batch at once
        points.forEach(
          (
            point: {
              restakesByPoint: number;
              slashedAmount: number;
              doubtedAmount: number;
              totalRestakeAmount: number;
              viewerCred?: number | undefined;
              restake?:
                | {
                    id: number;
                    amount: number;
                    originalAmount: number;
                    slashedAmount: number;
                    doubtedAmount: number;
                  }
                | null
                | undefined;
              slash?: { id: number; amount: number } | null | undefined;
              doubt?:
                | {
                    id: number;
                    amount: number;
                    userAmount: number;
                    isUserDoubt: boolean;
                  }
                | null
                | undefined;
              isPinned: boolean;
              isCommand: boolean;
              pinnedByCommandId: any;
              pointId: number;
              content: string;
              createdAt: Date;
              createdBy: string;
              space: string | null;
              amountNegations: number;
              amountSupporters: number;
              cred: number;
              negationsCred: number;
              negationIds: number[];
            } & { favor: number }
          ) => {
            setPointData({ pointId: point.pointId, userId }, point);
          }
        );

        // If this is the last batch, trigger a single refetch
        if (batchIndex === totalBatches - 1) {
          queryClient.invalidateQueries({ queryKey: ["feed", userId] });
        }
      }
    };

    // Cleanup
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [setPointData, queryClient]);

  const processPoints = (points: any[], userId: string) => {
    if (!workerRef.current) return;

    workerRef.current.postMessage({
      type: "PROCESS_POINTS",
      points,
      userId,
    });
  };

  return { processPoints };
};
