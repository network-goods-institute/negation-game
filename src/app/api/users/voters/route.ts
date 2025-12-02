import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { getVotersByIds } from "@/services/users/getVotersByIds";
import type { VoterData } from "@/types/voters";

interface VotersRequestBody {
  userIds?: string[];
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as VotersRequestBody | null;

    if (!body || !Array.isArray(body.userIds)) {
      return NextResponse.json(
        { error: "userIds must be an array of strings" },
        { status: 400 }
      );
    }

    const userIds = body.userIds
      .filter((id): id is string => typeof id === "string")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (userIds.length === 0) {
      return NextResponse.json({ voters: [] });
    }

    const voters: VoterData[] = await getVotersByIds(userIds);
    return NextResponse.json({ voters });
  } catch (error) {
    logger.error("Failed to fetch voters via API:", error);
    return NextResponse.json({ error: "Failed to fetch voters" }, { status: 500 });
  }
}
