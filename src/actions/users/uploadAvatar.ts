"use server";

import { getUserId } from "@/actions/users/getUserId";
import { db } from "@/services/db";
import { usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rateLimit";

const MAX_AVATAR_SIZE_BYTES = 1_000_000; // ~1MB
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const BUCKET = "profile-pictures";
const AVATAR_CACHE_SECONDS = 3600; // 1 hour
const AVATAR_RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

const getSupabaseConfig = () => ({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

const buildPublicUrl = (path: string, supabaseUrl?: string | null) => {
  const base = (supabaseUrl || "").replace(/\/+$/, "");
  if (!base) return null;
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
};

const extractObjectPath = (publicUrl: string | null | undefined, supabaseUrl?: string | null) => {
  if (!publicUrl || !supabaseUrl) return null;
  const normalizedBase = `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${BUCKET}/`;
  if (!publicUrl.startsWith(normalizedBase)) return null;
  return publicUrl.slice(normalizedBase.length).split("?")[0];
};

const deleteObjectIfExists = async (
  objectPath: string | null,
  supabaseUrl?: string | null,
  supabaseServiceKey?: string | null
) => {
  if (!objectPath || !supabaseUrl || !supabaseServiceKey) return;
  try {
    const deleteUrl = `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/${BUCKET}/${objectPath}`;
    const res = await fetch(deleteUrl, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        apikey: supabaseServiceKey,
      },
    });
    if (!res.ok && res.status !== 404) {
      logger.warn("[uploadAvatar] Failed to delete previous avatar", {
        status: res.status,
        statusText: res.statusText,
      });
    }
  } catch (error) {
    logger.warn("[uploadAvatar] Error deleting previous avatar", error);
  }
};

const detectImageType = (buffer: Buffer): "png" | "jpeg" | "webp" | null => {
  const isPng =
    buffer.length > 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;

  if (isPng) return "png";

  const isJpeg =
    buffer.length > 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[buffer.length - 2] === 0xff &&
    buffer[buffer.length - 1] === 0xd9;

  if (isJpeg) return "jpeg";

  const isWebp =
    buffer.length > 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP";

  if (isWebp) return "webp";

  return null;
};

export async function uploadAvatar(formData: FormData) {
  const { supabaseUrl, supabaseServiceKey } = getSupabaseConfig();
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

  const rateLimit = await checkRateLimit(
    userId,
    1,
    AVATAR_RATE_LIMIT_WINDOW_MS,
    "avatar-upload"
  );

  if (!rateLimit.allowed) {
    const retryIn = Math.max(0, rateLimit.resetTime - Date.now());
    const retrySeconds = Math.ceil(retryIn / 1000);
    return {
      success: false,
      error: `Too many avatar uploads. Try again in ${retrySeconds}s.`,
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
    const existingAvatar = await db
      .select({ avatarUrl: usersTable.avatarUrl })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    const arrayBuf = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    const detectedType = detectImageType(buffer);
    if (!detectedType) {
      return { success: false, error: "Invalid or unsupported image data" };
    }

    const typeFromHeader =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
        ? "webp"
        : "jpeg";

    if (detectedType !== typeFromHeader) {
      return {
        success: false,
        error: "File content does not match the declared image type",
      };
    }

    const safeUserId = encodeURIComponent(userId);
    if (!safeUserId) {
      return { success: false, error: "Invalid user identifier" };
    }
    const timestamp = Date.now();
    const ext = detectedType === "jpeg" ? "jpg" : detectedType;
    const objectPath = `${safeUserId}/${timestamp}.${ext}`;

    const uploadUrl = `${supabaseUrl.replace(
      /\/+$/,
      ""
    )}/storage/v1/object/${BUCKET}/${objectPath}`;

    const res = await fetch(uploadUrl, {
      method: "PUT",
      cache: "default",
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        apikey: supabaseServiceKey,
        "Content-Type": file.type,
        "x-upsert": "true",
        "Cache-Control": `public, max-age=${AVATAR_CACHE_SECONDS}, s-maxage=${AVATAR_CACHE_SECONDS}`,
      },
      body: buffer,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Upload failed: ${text || res.statusText}`);
    }

    const now = new Date();
    const publicUrl = buildPublicUrl(objectPath, supabaseUrl);

    await db
      .update(usersTable)
      .set({
        avatarUrl: publicUrl,
        avatarUpdatedAt: now,
      })
      .where(eq(usersTable.id, userId));

    const previousObjectPath = extractObjectPath(existingAvatar[0]?.avatarUrl, supabaseUrl);
    if (previousObjectPath && previousObjectPath !== objectPath) {
      await deleteObjectIfExists(previousObjectPath, supabaseUrl, supabaseServiceKey);
    }

    logger.log("[uploadAvatar] avatar updated", {
      userId,
      size: file.size,
      type: file.type,
      objectPath,
    });

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
