import { useEffect, useRef, useState } from "react";
import { useSetPointData, PointData } from "@/queries/points/usePointData";
import { useQueryClient } from "@tanstack/react-query";
import { getWorkerCode } from "@/workers/workerCode";
import {
  isBrowser,
  areWorkersSupported,
} from "@/lib/error-handling/buildDiagnostics";

const processPointsDirectly = (
  points: any[],
  userId: string,
  queryClient: ReturnType<typeof useQueryClient>
) => {
  if (!Array.isArray(points) || !points.length) return;

  const transformedPoints = points.map((point) => ({
    ...point,
    restakesByPoint: point.restakesByPoint ?? 0,
    slashedAmount: point.slashedAmount ?? 0,
    doubtedAmount: point.doubtedAmount ?? 0,
    totalRestakeAmount: point.totalRestakeAmount ?? 0,
    isCommand: !!point.isCommand,
    isPinned: !!point.isPinned,
    pinnedByCommandId: point.pinnedByCommandId ?? null,
    doubt: point.doubt ?? null,
    pinCommands: point.pinCommands ?? [],
  }));

  transformedPoints.forEach((point) => {
    const queryKey = [point.pointId, "point", userId];
    queryClient.setQueryData(queryKey, point);
  });

  queryClient.setQueryData(["feed", userId], (oldData: any) => oldData);
};

let hasLoggedWorkerError = false;

export const useFeedWorker = () => {
  const workerRef = useRef<Worker | null>(null);
  const setPointData = useSetPointData();
  const queryClient = useQueryClient();
  const [isWorkerSupported, setIsWorkerSupported] = useState<boolean>(false);

  useEffect(() => {
    if (!isBrowser()) {
      return;
    }

    if (!areWorkersSupported()) {
      return;
    }

    try {
      const workerCode = getWorkerCode();

      const blob = new Blob([workerCode], { type: "application/javascript" });
      const workerUrl = URL.createObjectURL(blob);
      const worker = new Worker(workerUrl);

      workerRef.current = worker;
      setIsWorkerSupported(true);

      worker.onmessage = (e) => {
        if (e.data?.type === "BATCH_PROCESSED") {
          const { points, userId, batchIndex, totalBatches } = e.data;

          if (batchIndex === 0) {
          }

          if (Array.isArray(points)) {
            points.forEach((point: PointData) => {
              const queryKey = [point.pointId, "point", userId];
              queryClient.setQueryData(queryKey, point);
            });
          }

          if (batchIndex === totalBatches - 1) {
            queryClient.setQueryData(
              ["feed", userId],
              (oldData: any) => oldData
            );
          }
        } else if (e.data?.type === "ERROR") {
          console.error("Worker error:", e.data.message);
        }
      };

      worker.onerror = (error) => {
        console.error("Worker error event:", error);
        setIsWorkerSupported(false);
      };

      return () => {
        URL.revokeObjectURL(workerUrl);
        worker.terminate();
        workerRef.current = null;
      };
    } catch (error) {
      if (!hasLoggedWorkerError) {
        console.error("Error creating worker:", error);
        hasLoggedWorkerError = true;
      }
      setIsWorkerSupported(false);
      return undefined;
    }
  }, [queryClient, setPointData]);

  const processPoints = (points: any[], userId: string) => {
    if (!isBrowser()) {
      processPointsDirectly(points, userId, queryClient);
      return;
    }

    if (
      !isWorkerSupported ||
      !workerRef.current ||
      !Array.isArray(points) ||
      !points.length
    ) {
      processPointsDirectly(points, userId, queryClient);
      return;
    }

    try {
      workerRef.current.postMessage({
        type: "PROCESS_POINTS",
        points,
        userId,
      });
    } catch (error) {
      console.error("Error posting message to worker:", error);
      processPointsDirectly(points, userId, queryClient);
    }
  };

  return { processPoints };
};
