import { db } from "@/services/db";
import { mpDocsTable } from "@/db/tables/mpDocsTable";
import { eq, or } from "drizzle-orm";
import { Metadata } from "next";

type Props = {
    params: { id: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = params;
    const rows = await db
        .select()
        .from(mpDocsTable)
        .where(or(eq(mpDocsTable.id, id), eq(mpDocsTable.slug, id)))
        .limit(1);
    const doc = rows[0] as any;
    const title = doc?.title || "Rationale";

    return {
        title: `${title} | Negation Game`,
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
