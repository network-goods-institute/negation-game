import { Metadata } from "next";
import { db } from "@/services/db";
import { viewpointsTable, usersTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { DEFAULT_SPACE } from "@/constants/config";

interface Props {
    params: {
        rationaleId: string;
        space: string;
    };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const viewpoint = await db
        .select({
            id: viewpointsTable.id,
            title: viewpointsTable.title,
            description: viewpointsTable.description,
            createdBy: viewpointsTable.createdBy,
            createdAt: viewpointsTable.createdAt,
            space: viewpointsTable.space,
            author: usersTable.username,
        })
        .from(viewpointsTable)
        .innerJoin(usersTable, eq(usersTable.id, viewpointsTable.createdBy))
        .where(
            and(
                eq(viewpointsTable.id, params.rationaleId),
                eq(viewpointsTable.space, params.space === 'global' ? DEFAULT_SPACE : params.space)
            )
        )
        .limit(1)
        .then(results => results[0]);

    if (!viewpoint) {
        return {
            title: "Rationale Not Found",
            description: "The requested rationale could not be found in this space.",
        };
    }

    const truncatedDescription = viewpoint.description
        ? viewpoint.description.length > 200
            ? viewpoint.description.substring(0, 197) + "..."
            : viewpoint.description
        : "No description available";

    const title = `${viewpoint.title} | s/${params.space}`;

    return {
        title,
        description: truncatedDescription,
        openGraph: {
            title,
            description: truncatedDescription,
            type: "article",
            authors: [viewpoint.author],
            url: `/s/${params.space}/rationale/${params.rationaleId}`,
        },
        twitter: {
            card: "summary_large_image",
            title,
            description: truncatedDescription,
            creator: viewpoint.author,
            site: "@negationgame",
        },
    };
}

export default function RationaleLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
