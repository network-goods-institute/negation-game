import { useEffect, useRef } from "react";
import { useSetPointData, PointData } from "@/queries/usePointData";
import { useQueryClient } from "@tanstack/react-query";

export const useFeedWorker = () => {
  const workerRef = useRef<Worker | null>(null);
  const setPointData = useSetPointData();
  const queryClient = useQueryClient();

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../workers/feedProcessor.ts", import.meta.url),
      {
        type: "module",
      }
    );

    workerRef.current.onmessage = (e) => {
      if (e.data.type === "BATCH_PROCESSED") {
        const { points, userId, batchIndex, totalBatches } = e.data;

        points.forEach((point: PointData) => {
          const queryKey = [point.pointId, "point", userId];
          queryClient.setQueryData(queryKey, point);
        });

        if (batchIndex === totalBatches - 1) {
          queryClient.setQueryData(["feed", userId], (oldData: any) => oldData);
        }
      }
    };

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
