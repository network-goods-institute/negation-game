// Web worker for processing feed points
type Point = {
  pointId: number;
  userId: string;
  [key: string]: any;
};

type WorkerMessage = {
  type: "PROCESS_POINTS";
  points: Point[];
  userId: string;
};

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  if (e.data.type === "PROCESS_POINTS") {
    const { points, userId } = e.data;

    const batchSize = 50;
    const batches = Math.ceil(points.length / batchSize);

    for (let i = 0; i < batches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, points.length);
      const batch = points.slice(start, end);

      const transformedPoints = batch.map((point) => {
        return {
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
        };
      });

      // Send back processed batch
      self.postMessage({
        type: "BATCH_PROCESSED",
        points: transformedPoints,
        userId,
        batchIndex: i,
        totalBatches: batches,
      });

      if (i < batches - 1) {
        new Promise((resolve) => setTimeout(resolve, 20));
      }
    }

    // Signal completion
    self.postMessage({
      type: "PROCESSING_COMPLETE",
    });
  }
};
