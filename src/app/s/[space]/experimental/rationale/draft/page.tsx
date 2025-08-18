import { db } from "@/services/db";
import { experimentalGraphDocsTable } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import Link from "next/link";

export default async function DraftsIndexPage({ params }: { params: Promise<{ space: string }> }) {
    const { space } = await params;
    const rows = await db
        .select({ id: experimentalGraphDocsTable.id, title: experimentalGraphDocsTable.title, updatedAt: experimentalGraphDocsTable.updatedAt })
        .from(experimentalGraphDocsTable)
        .where(and(eq(experimentalGraphDocsTable.space, space), eq(experimentalGraphDocsTable.isActive, true)));

    return (
        <div className="max-w-3xl mx-auto p-6">
            <h1 className="text-xl font-semibold mb-4">Draft rationales</h1>
            <div className="space-y-2">
                {rows.map((r) => (
                    <Link key={r.id} href={`/s/${space}/experimental/rationale/draft/${r.id}`} className="block border rounded-md p-3 hover:bg-muted/30">
                        <div className="font-medium">{r.title || "Untitled Experimental Rationale"}</div>
                        <div className="text-xs text-muted-foreground">Updated {new Date(r.updatedAt).toLocaleString()}</div>
                    </Link>
                ))}
                {rows.length === 0 && <div className="text-sm text-muted-foreground">No drafts yet.</div>}
            </div>
        </div>
    );
}