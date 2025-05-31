/// <reference lib="webworker" />

self.onmessage = function (e) {
  if (!e.data || e.data.type !== "PROCESS_POINTS") {
    return;
  }

  try {
    const { points, userId } = e.data;

    if (!Array.isArray(points) || !userId) {
      self.postMessage({
        type: "ERROR",
        message: "Invalid data provided to worker",
      });
      return;
    }

    const batchSize = 50;
    const batches = Math.ceil(points.length / batchSize);

    for (let i = 0; i < batches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, points.length);
      const batch = points.slice(start, end);

      const transformedPoints = batch.map((point) => ({
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

      self.postMessage({
        type: "BATCH_PROCESSED",
        points: transformedPoints,
        userId,
        batchIndex: i,
        totalBatches: batches,
      });

      if (i < batches - 1) {
        // yield back to event loop
        setTimeout(() => {}, 10);
      }
    }

    self.postMessage({ type: "PROCESSING_COMPLETE" });
  } catch (error) {
    self.postMessage({
      type: "ERROR",
      message:
        error instanceof Error ? error.message : "Unknown error in worker",
    });
  }
};
