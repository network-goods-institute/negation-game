"use server";

import { getUserId } from "@/actions/users/getUserId";
import { logger } from "@/lib/logger";
import { fetchMonthlyBoardStats } from "@/services/admin/monthlyBoardStatsService";
import { requireSiteAdmin } from "@/utils/adminUtils";

export async function fetchMonthlyBoardStatsAction(input: {
  month?: number;
  year?: number;
}) {
  const userId = await getUserId();

  if (!userId) {
    throw new Error("Must be authenticated to run monthly board stats");
  }

  await requireSiteAdmin(userId);

  try {
    return await fetchMonthlyBoardStats(input);
  } catch (error) {
    logger.error("[fetchMonthlyBoardStatsAction] Failed to run monthly board stats", error);
    throw new Error("Failed to run monthly board stats");
  }
}
