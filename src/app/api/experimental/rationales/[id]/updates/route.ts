import { NextResponse } from "next/server";
import { db } from "@/services/db";
import { mpDocsTable } from "@/db/tables/mpDocsTable";
import { mpDocUpdatesTable } from "@/db/tables/mpDocUpdatesTable";
import { eq, sql } from "drizzle-orm";
import { getUserId } from "@/actions/users/getUserId";
import { compactDocUpdates } from "@/services/yjsCompaction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: any) {
  if (process.env.NEXT_PUBLIC_MULTIPLAYER_EXPERIMENT_ENABLED !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const userId = await getUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const raw = ctx?.params;
  const { id } =
    raw && typeof raw.then === "function" ? await raw : (raw as { id: string });
  if (!/^[a-zA-Z0-9:_-]{1,128}$/.test(id)) {
    return NextResponse.json({ error: "Invalid doc id" }, { status: 400 });
  }
  const body = await req.arrayBuffer();
  const updateBuf = Buffer.from(body);
  try {
  } catch {}

  // basic size cap ~ 1MB
  if (updateBuf.byteLength > 1_000_000) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  await db.insert(mpDocsTable).values({ id }).onConflictDoNothing();

  await db
    .insert(mpDocUpdatesTable)
    .values({ docId: id, updateBin: updateBuf, userId });
  await db
    .update(mpDocsTable)
    .set({ updatedAt: new Date() })
    .where(eq(mpDocsTable.id, id));
  try {
  } catch {}

  // Inline fast compaction when threshold exceeded
  try {
    const countRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(mpDocUpdatesTable)
      .where(eq(mpDocUpdatesTable.docId, id));
    const count = Number(countRows?.[0]?.count || 0);
    const threshold = 30;
    if (count > threshold) {
      // Keep a small tail to avoid losing very recent fine-grained deltas
      await compactDocUpdates(id, { keepLast: 3 });
    }
  } catch (e) {}

  try {
    const currentDoc = await db.execute(sql`
      SELECT title FROM mp_docs WHERE id = ${id} LIMIT 1
    `);
    const currentBoardTitle = (currentDoc as any[])?.[0]?.title;

    if (!currentBoardTitle || currentBoardTitle === "Untitled") {
      const { getDocSnapshotBuffer } = await import("@/services/yjsCompaction");
      const docBuffer = await getDocSnapshotBuffer(id);

      if (docBuffer && docBuffer.length > 0) {
        const Y = await import("yjs");
        const ydoc = new Y.Doc();
        Y.applyUpdate(ydoc, new Uint8Array(docBuffer));

        const yNodesMap = ydoc.getMap("nodes");
        const yTextMap = ydoc.getMap("node_text");

        const allNodeKeys = Array.from(yNodesMap.keys());
        const allTextKeys = Array.from(yTextMap.keys());

        let titleNodeContent = "";
        let titleNodeId = "";

        yNodesMap.forEach((node: any, nodeId: string) => {
          if (node?.type === "title") {
            titleNodeId = nodeId;
            const titleText = yTextMap.get(nodeId);

            if (titleText) {
              titleNodeContent = titleText.toString().trim();
            } else if (node?.data?.content) {
              titleNodeContent = node.data.content.trim();
            }
          }
        });
        const possibleTitleIds = ["title", "title-node", "t"];
        for (const titleId of possibleTitleIds) {
          const titleNode = yNodesMap.get(titleId);
          if (titleNode) {
            console.log(
              `[Board Title Sync] Found title node by ID "${titleId}":`,
              JSON.stringify(titleNode)
            );
            if (!titleNodeContent) {
              const titleText = yTextMap.get(titleId);
              if (titleText) {
                titleNodeContent = titleText.toString().trim();
              } else if ((titleNode as any)?.data?.content) {
                titleNodeContent = (titleNode as any).data.content.trim();
              } else if ((titleNode as any)?.data?.title) {
                titleNodeContent = (titleNode as any).data.title.trim();
              }
            }
            break;
          }
        }

        // If we still don't have title content, but there's a 'title' text entry, use that
        if (!titleNodeContent) {
          const titleText = yTextMap.get("title");
          if (titleText) {
            titleNodeContent = titleText.toString().trim();

            // Fix corrupted state: title node exists in text map but not in nodes map
            // Reconstruct the title node in the nodes map
            if (titleNodeContent) {
              const titleNode = {
                id: "title",
                type: "title",
                position: { x: 250, y: 120 },
                data: { content: titleNodeContent },
              };
              yNodesMap.set("title", titleNode);

              // Apply this fix to the YJS document by creating an update
              const update = Y.encodeStateAsUpdate(ydoc);
              await db.insert(mpDocUpdatesTable).values({
                docId: id,
                updateBin: Buffer.from(update),
                userId,
              });
            }
          }
        }

        if (
          titleNodeContent &&
          titleNodeContent !== "Untitled" &&
          titleNodeContent !== currentBoardTitle
        ) {
          await db
            .update(mpDocsTable)
            .set({ title: titleNodeContent, updatedAt: new Date() })
            .where(eq(mpDocsTable.id, id));
        }
      }
    }
  } catch (e) {
    console.error(`[Board Title Sync] Error:`, e);
  }

  return NextResponse.json({ ok: true });
}
