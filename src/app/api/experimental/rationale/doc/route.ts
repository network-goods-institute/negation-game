import { NextResponse } from "next/server";
import { db } from "@/services/db";
import { experimentalGraphDocsTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing id parameter" },
        { status: 400 }
      );
    }

    const doc = await db
      .select()
      .from(experimentalGraphDocsTable)
      .where(eq(experimentalGraphDocsTable.id, id))
      .limit(1);

    if (!doc[0]) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Return a clean document structure to avoid migration issues
    const cleanDoc = {
      ...doc[0],
      doc: doc[0].doc || {
        version: 1,
        shapes: [],
        bindings: [],
        assets: [],
        meta: {
          font: "Roboto Slab",
          theme: "experimental",
        },
      },
    };

    return NextResponse.json(cleanDoc);
  } catch (error) {
    console.error("Error fetching experimental doc:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
