import { useEffect, useRef } from "react";
import { useSetPointData, PointData } from "@/queries/usePointData";
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

        // Instead of processing each point individually (which causes excessive network requests),
        // directly update the query cache for each point all at once
        points.forEach((point: PointData) => {
          // Update the point data in the cache without triggering network requests
          const queryKey = [point.pointId, "point", userId];
          queryClient.setQueryData(queryKey, point);
        });

        // Log the batch processing (only in development)
        if (process.env.NODE_ENV === "development") {
          console.log(
            `%c[FEED] Processed batch ${batchIndex + 1}/${totalBatches} with ${points.length} points`,
            "color: #4CAF50; font-weight: bold;"
          );
        }

        // If this is the last batch, trigger a single refetch of the feed
        // but not individual points (which would cause more network requests)
        if (batchIndex === totalBatches - 1) {
          // Mark the feed query as fresh to avoid refetching
          queryClient.setQueryData(["feed", userId], (oldData: any) => oldData);
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

    if (process.env.NODE_ENV === "development") {
      console.log(
        `%c[FEED] Processing ${points.length} points in worker`,
        "color: #2196F3; font-weight: bold;"
      );
    }

    workerRef.current.postMessage({
      type: "PROCESS_POINTS",
      points,
      userId,
    });
  };

  return { processPoints };
};
