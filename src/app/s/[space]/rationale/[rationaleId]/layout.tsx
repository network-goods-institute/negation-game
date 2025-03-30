import { Metadata } from "next";
import { db } from "@/services/db";
import { viewpointsTable, usersTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { DEFAULT_SPACE } from "@/constants/config";

interface Props {
    params: Promise<{
        rationaleId: string;
        space: string;
    }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    try {
        const resolvedParams = await params;
        const { rationaleId, space: spaceParam } = resolvedParams;

        if (!rationaleId) {
            return {
                title: "Invalid Rationale ID",
                description: "The rationale ID is invalid or missing.",
            };
        }

        const space = spaceParam === 'global' ? DEFAULT_SPACE : spaceParam;

        const notFoundMetadata = {
            title: "Rationale Not Found",
            description: `The requested rationale could not be found in s/${spaceParam}.`,
        };

        const viewpoints = await db
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
            .innerJoin(
                usersTable,
                eq(usersTable.id, viewpointsTable.createdBy)
            )
            .where(
                and(
                    eq(viewpointsTable.id, rationaleId),
                    eq(viewpointsTable.space, space)
                )
            )
            .limit(1);

        const viewpoint = viewpoints[0];

        if (!viewpoint) {
            return notFoundMetadata;
        }

        const truncatedDescription = viewpoint.description
            ? viewpoint.description.length > 200
                ? viewpoint.description.substring(0, 197) + "..."
                : viewpoint.description
            : "No description available";

        const title = `${viewpoint.title} | s/${spaceParam}`;

        return {
            title,
            description: truncatedDescription,
            openGraph: {
                title,
                description: truncatedDescription,
                type: "article",
                authors: [viewpoint.author],
                url: `/s/${spaceParam}/rationale/${rationaleId}`,
            },
            twitter: {
                card: "summary_large_image",
                title,
                description: truncatedDescription,
                creator: viewpoint.author,
                site: "@negationgame",
            },
        };
    } catch (error) {
        console.error("Error generating metadata for rationale:", error);
        return {
            title: "Error Loading Rationale",
            description: "There was an error loading this rationale.",
        };
    }
}

export default function RationaleLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
