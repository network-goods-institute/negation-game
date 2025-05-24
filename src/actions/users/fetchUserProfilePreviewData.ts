"use server";

import { db } from "@/services/db";
import { viewpointsTable } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { fetchUser } from "./fetchUser";

export const fetchUserProfilePreviewData = async (userId: string) => {
  if (!userId) {
    return null;
  }

  try {
    const user = await fetchUser(userId);

    if (!user) {
      return null;
    }

    const rationaleCountResult = await db
      .select({
        value: count(viewpointsTable.id),
      })
      .from(viewpointsTable)
      .where(eq(viewpointsTable.createdBy, user.id))
      .limit(1);

    const rationalesCount = rationaleCountResult[0]?.value ?? 0;

    const result = {
      bio: user.bio,
      delegationUrl: user.delegationUrl,
      createdAt: user.createdAt,
      rationalesCount: rationalesCount,
    };
    return result;
  } catch (error) {
    console.error(
      `[fetchUserProfilePreviewData] Error fetching data for userId ${userId}:`,
      error
    );
    return null; // Indicate error fetching data
  }
};

export type ProfilePreviewData = Awaited<
  ReturnType<typeof fetchUserProfilePreviewData>
>;
