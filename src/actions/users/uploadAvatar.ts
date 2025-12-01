"use server";

import { getUserId } from "@/actions/users/getUserId";
import { db } from "@/services/db";
import { usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";

const MAX_AVATAR_SIZE_BYTES = 1_000_000; // ~1MB
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const BUCKET = "profile-pictures";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const buildPublicUrl = (path: string) => {
  if (!supabaseUrl) return null;
  const base = supabaseUrl.replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
};

export async function uploadAvatar(formData: FormData) {
  const userId = await getUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      success: false,
      error: "Avatar storage not configured (set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)",
    };
  }

  const file = formData.get("avatar");
  if (!(file instanceof File)) {
    return { success: false, error: "Avatar file is required" };
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return { success: false, error: "Unsupported file type" };
  }

  if (file.size === 0 || file.size > MAX_AVATAR_SIZE_BYTES) {
    return { success: false, error: "Avatar must be between 1 byte and 1MB" };
  }

  try {
    const arrayBuf = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const safeUserId = encodeURIComponent(userId);
    const objectPath = `${safeUserId}.${ext}`;

    const uploadUrl = `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/${BUCKET}/${objectPath}`;

    const res = await fetch(uploadUrl, {
      method: "PUT",
      cache: "default",
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        apikey: supabaseServiceKey,
        "Content-Type": file.type,
        "x-upsert": "true",
        "Cache-Control": "public, max-age=31536000",
      },
      body: buffer,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Upload failed: ${text || res.statusText}`);
    }

    const now = new Date();
    const publicUrl = buildPublicUrl(objectPath);

    await db
      .update(usersTable)
      .set({
        avatarUrl: publicUrl,
        avatarUpdatedAt: now,
      })
      .where(eq(usersTable.id, userId));

    return {
      success: true,
      avatarUrl: publicUrl,
      updatedAt: now.toISOString(),
    };
  } catch (error) {
    logger.error("[uploadAvatar] failed", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload avatar",
    };
  }
}
