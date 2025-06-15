"use server";

import { getUserId } from "@/actions/users/getUserId";
import { db } from "@/services/db";
import { usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateProfileSchema = z.object({
  bio: z.string().max(1000).nullable().optional(),
  delegationUrl: z.string().url().max(255).nullable().optional(),
  discourseUsername: z.string().max(255).nullable().optional(),
  discourseCommunityUrl: z.string().url().max(255).nullable().optional(),
  discourseConsentGiven: z.boolean(),
});

export type UpdateProfileParams = z.infer<typeof updateProfileSchema>;

export const updateUserProfile = async (params: UpdateProfileParams) => {
  try {
    const userId = await getUserId();
    if (!userId) {
      throw new Error("User not logged in");
    }

    // Validate inputs
    const validatedData = updateProfileSchema.parse(params);

    // Update the user profile
    await db
      .update(usersTable)
      .set({
        bio: validatedData.bio,
        delegationUrl: validatedData.delegationUrl,
        discourseUsername: validatedData.discourseUsername,
        discourseCommunityUrl: validatedData.discourseCommunityUrl,
        discourseConsentGiven: validatedData.discourseConsentGiven,
      })
      .where(eq(usersTable.id, userId));

    return { success: true };
  } catch (error) {
    console.error("Error updating profile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
