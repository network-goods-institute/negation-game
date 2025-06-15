"use server";

import { getUserId } from "@/actions/users/getUserId";
import { usersTable } from "@/db/schema";
import { db } from "@/services/db";
import { eq } from "drizzle-orm";

export interface UpdateUserSettingsArgs {
  showReadReceipts?: boolean;
  receiveReadReceipts?: boolean;
}

export const updateUserSettings = async (args: UpdateUserSettingsArgs) => {
  const userId = await getUserId();

  if (!userId) {
    throw new Error("Must be authenticated to update settings");
  }

  const updateData: any = {};

  if (args.showReadReceipts !== undefined) {
    updateData.showReadReceipts = args.showReadReceipts;
  }

  if (args.receiveReadReceipts !== undefined) {
    updateData.receiveReadReceipts = args.receiveReadReceipts;
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error("No settings to update");
  }

  await db.update(usersTable).set(updateData).where(eq(usersTable.id, userId));

  return { success: true };
};
