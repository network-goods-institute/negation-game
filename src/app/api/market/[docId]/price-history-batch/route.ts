import { NextRequest, NextResponse } from "next/server";
import { getPriceHistory } from "@/actions/market/getPriceHistory";

export async function POST(req: NextRequest, ctx: any) {
  try {
    const body = await req.json();
    const { securityIds, limit } = body;

    if (!Array.isArray(securityIds) || securityIds.length === 0) {
      return NextResponse.json(
        { error: "securityIds array required" },
        { status: 400 }
      );
    }

    const maxBatchSize = 100;
    if (securityIds.length > maxBatchSize) {
      return NextResponse.json(
        { error: `Batch size exceeds maximum of ${maxBatchSize}` },
        { status: 400 }
      );
    }

    const raw = ctx?.params;
    const { docId } =
      raw && typeof raw.then === "function"
        ? await raw
        : (raw as { docId: string });

    // Fetch histories in parallel
    const histories = await Promise.all(
      securityIds.map(async (securityId: string) => {
        try {
          const history = await getPriceHistory(docId, securityId, limit);
          return { securityId, history, error: null };
        } catch (error) {
          return {
            securityId,
            history: null,
            error:
              error instanceof Error
                ? error.message
                : "Failed to fetch history",
          };
        }
      })
    );

    return NextResponse.json(histories);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to get price histories",
      },
      { status: 500 }
    );
  }
}
