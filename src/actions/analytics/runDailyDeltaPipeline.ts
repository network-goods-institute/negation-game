"use server";

import { dailySnapshotJob } from "./dailySnapshotJob";
import { stanceComputationPipeline } from "./stanceComputationPipeline";
import { enforceRestakeCap } from "../epistemic/enforceRestakeCap";import { logger } from "@/lib/logger";

export async function runDailyDeltaPipeline(
  snapDay: string = new Date().toISOString().slice(0, 10)
): Promise<{ success: boolean; message: string; results: any }> {
  logger.log(
    `[runDailyDeltaPipeline] Starting full delta pipeline for ${snapDay}`
  );

  const results = {
    snapshotJob: null as any,
    stanceComputation: null as any,
    restakeCapEnforcement: null as any,
    startTime: new Date().toISOString(),
    endTime: null as string | null,
    totalDuration: null as number | null,
  };

  const startTime = Date.now();

  try {
    // Step 1: Run daily snapshot job
    logger.log(`[runDailyDeltaPipeline] Step 1: Running daily snapshot job`);
    results.snapshotJob = await dailySnapshotJob(snapDay);

    if (!results.snapshotJob.success) {
      throw new Error(`Snapshot job failed: ${results.snapshotJob.message}`);
    }

    // Step 2: Run stance computation pipeline
    logger.log(
      `[runDailyDeltaPipeline] Step 2: Running stance computation pipeline`
    );
    results.stanceComputation = await stanceComputationPipeline(snapDay);

    if (!results.stanceComputation.success) {
      throw new Error(
        `Stance computation failed: ${results.stanceComputation.message}`
      );
    }

    // Step 3: Enforce restake caps
    logger.log(`[runDailyDeltaPipeline] Step 3: Enforcing restake caps`);
    results.restakeCapEnforcement = await enforceRestakeCap();

    if (!results.restakeCapEnforcement.success) {
      logger.warn(
        `[runDailyDeltaPipeline] Restake cap enforcement had issues: ${results.restakeCapEnforcement.message}`
      );
      // Don't fail the whole pipeline for restake cap issues
    }

    const endTime = Date.now();
    results.endTime = new Date(endTime).toISOString();
    results.totalDuration = endTime - startTime;

    logger.log(
      `[runDailyDeltaPipeline] Pipeline completed successfully in ${results.totalDuration}ms`
    );

    return {
      success: true,
      message: `Daily delta pipeline completed successfully for ${snapDay}`,
      results,
    };
  } catch (error) {
    const endTime = Date.now();
    results.endTime = new Date(endTime).toISOString();
    results.totalDuration = endTime - startTime;

    logger.error("[runDailyDeltaPipeline] Pipeline failed:", error);

    return {
      success: false,
      message: `Daily delta pipeline failed: ${error instanceof Error ? error.message : String(error)}`,
      results,
    };
  }
}

/**
 * Manual trigger for testing or catch-up processing
 */
export async function runDeltaPipelineForDateRange(
  startDate: string,
  endDate: string
): Promise<{ success: boolean; message: string; results: any[] }> {
  logger.log(
    `[runDeltaPipelineForDateRange] Running pipeline for date range ${startDate} to ${endDate}`
  );

  const results: any[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  let currentDate = new Date(start);

  while (currentDate <= end) {
    const snapDay = currentDate.toISOString().slice(0, 10);
    logger.log(`[runDeltaPipelineForDateRange] Processing ${snapDay}`);

    const result = await runDailyDeltaPipeline(snapDay);
    results.push({
      date: snapDay,
      ...result,
    });

    if (!result.success) {
      logger.error(
        `[runDeltaPipelineForDateRange] Failed on ${snapDay}: ${result.message}`
      );
      // Continue with next date even if one fails
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  const successCount = results.filter((r) => r.success).length;
  const totalCount = results.length;

  return {
    success: successCount === totalCount,
    message: `Processed ${totalCount} days, ${successCount} successful, ${totalCount - successCount} failed`,
    results,
  };
}
