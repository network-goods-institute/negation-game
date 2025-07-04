"use server";

import { getUserId } from "@/actions/users/getUserId";
import { db } from "@/services/db";
import { usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateProfileSchema = z.object({
  bio: z.string().max(1000).nullable().optional(),
  delegationUrl: z.string().url().max(255).nullable().optional(),
  agoraLink: z.string().url().max(255).nullable().optional(),
  scrollDelegateLink: z.string().url().max(255).nullable().optional(),
  discourseUsername: z.string().max(255).nullable().optional(),
  discourseCommunityUrl: z.string().url().max(255).nullable().optional(),
  discourseConsentGiven: z.boolean().optional(),
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

    const updateData: Partial<typeof usersTable.$inferInsert> = {};

    if (validatedData.bio !== undefined) updateData.bio = validatedData.bio;
    if (validatedData.delegationUrl !== undefined)
      updateData.delegationUrl = validatedData.delegationUrl;
    if (validatedData.agoraLink !== undefined)
      updateData.agoraLink = validatedData.agoraLink;
    if (validatedData.scrollDelegateLink !== undefined)
      updateData.scrollDelegateLink = validatedData.scrollDelegateLink;
    if (validatedData.discourseUsername !== undefined)
      updateData.discourseUsername = validatedData.discourseUsername;
    if (validatedData.discourseCommunityUrl !== undefined)
      updateData.discourseCommunityUrl = validatedData.discourseCommunityUrl;
    if (validatedData.discourseConsentGiven !== undefined)
      updateData.discourseConsentGiven = validatedData.discourseConsentGiven;

    // Update the user profile
    await db
      .update(usersTable)
      .set(updateData)
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
