import { trackViewpointCopy } from "@/actions/viewpoints/trackViewpointCopy";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing viewpoint ID" },
        { status: 400 }
      );
    }

    await trackViewpointCopy(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error tracking viewpoint copy:", error);
    return NextResponse.json(
      { error: "Failed to track viewpoint copy" },
      { status: 500 }
    );
  }
}
