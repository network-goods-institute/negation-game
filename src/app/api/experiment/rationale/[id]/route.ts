import { NextResponse } from "next/server";
import { fetchViewpointForEmbed } from "@/actions/viewpoints/fetchViewpoint";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
  try {
    const raw = (ctx as any).params;
    const { id } =
      typeof raw.then === "function"
        ? await (raw as Promise<{ id: string }>)
        : (raw as { id: string });
    const vp = await fetchViewpointForEmbed(id);
    if (!vp?.graph)
      return NextResponse.json({ error: "not_found" }, { status: 404 });

    const graph = vp.graph;
    const enrichedNodes = graph.nodes || [];

    const payload = {
      id,
      title: vp.title || "",
      space: vp.space || "scroll",
      nodes: enrichedNodes,
      edges: graph.edges || [],
    };
    return NextResponse.json(payload);
  } catch (e) {
    console.error("[api][experiment][rationale] error", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
