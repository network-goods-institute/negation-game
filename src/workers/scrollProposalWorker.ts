import { detectScrollProposals } from "@/actions/notifications/detectScrollProposals";import { logger } from "@/lib/logger";

/**
 * Worker to detect Scroll governance proposals
 * This can be called by:
 * 1. Manual API endpoint (/api/notifications/detect-scroll-proposals)
 * 2. External cron service (e.g., GitHub Actions, Vercel Cron, etc.)
 * 3. Application startup if needed
 */
export class ScrollProposalWorker {
  private static isRunning = false;
  private static lastRun: Date | null = null;

  /**
   * Run the proposal detection
   * Includes basic safeguards to prevent multiple simultaneous runs
   */
  static async run(): Promise<{
    success: boolean;
    message: string;
    lastRun?: Date;
  }> {
    if (this.isRunning) {
      return {
        success: false,
        message: "Scroll proposal detection is already running",
      };
    }

    try {
      this.isRunning = true;
      logger.log("Starting Scroll proposal detection...");

      await detectScrollProposals();

      this.lastRun = new Date();
      logger.log("Scroll proposal detection completed successfully");

      return {
        success: true,
        message: "Scroll proposal detection completed successfully",
        lastRun: this.lastRun,
      };
    } catch (error) {
      logger.error("Error in Scroll proposal worker:", error);
      return {
        success: false,
        message: `Scroll proposal detection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get worker status
   */
  static getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
    };
  }
}
