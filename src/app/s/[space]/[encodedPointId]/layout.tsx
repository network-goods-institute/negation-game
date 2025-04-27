import { Metadata } from "next";
import { db } from "@/services/db";
import { pointsWithDetailsView, usersTable } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { DEFAULT_SPACE } from "@/constants/config";
import { decodeId } from "@/lib/negation-game/decodeId";
import { addFavor } from "@/db/utils/addFavor";
import { getColumns } from "@/db/utils/getColumns";

interface Props {
    params: Promise<{
        encodedPointId: string;
        space: string;
    }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    try {
        const resolvedParams = await params;
        const { encodedPointId, space: spaceParam } = resolvedParams;

        if (!encodedPointId) {
            return {
                title: "Invalid Point ID",
                description: "The point ID is invalid or missing.",
            };
        }

        const pointId = decodeId(encodedPointId);
        const space = spaceParam === DEFAULT_SPACE ? DEFAULT_SPACE : spaceParam;

        const domain = process.env.NODE_ENV === "development"
            ? "localhost:3000"
            : process.env.NEXT_PUBLIC_DOMAIN || "negationgame.com";
        const protocol = process.env.NODE_ENV === "development" ? "http" : "https";

        const notFoundMetadata = {
            title: "Point Not Found",
            description: `The requested point could not be found in s/${spaceParam}.`,
        };

        if (pointId === null) {
            return notFoundMetadata;
        }

        const points = await db
            .select({
                ...getColumns(pointsWithDetailsView),
                author: usersTable.username,
                cred: sql<number>`"point_with_details_view"."cred"`.mapWith(Number),
            })
            .from(pointsWithDetailsView)
            .innerJoin(
                usersTable,
                eq(usersTable.id, pointsWithDetailsView.createdBy)
            )
            .where(and(
                eq(pointsWithDetailsView.pointId, pointId),
                eq(pointsWithDetailsView.space, space)
            ))
            .limit(1);

        const point = points[0];

        if (!point) {
            return notFoundMetadata;
        }
        if (point.pointId === undefined || point.pointId === null) {
            return notFoundMetadata;
        }
        const favorResults = await addFavor([{ id: point.pointId }]);

        if (!favorResults || favorResults.length === 0) {
            return notFoundMetadata;
        }

        const pointWithFavor = favorResults[0];
        if (!pointWithFavor || pointWithFavor.favor === undefined) {
            return notFoundMetadata;
        }

        const truncatedContent = point.content && typeof point.content === 'string'
            ? (point.content.length > 200
                ? point.content.substring(0, 197) + "..."
                : point.content)
            : "No content available";

        const title = `${point.content || "Point"} | ${pointWithFavor.favor} Favor | s/${spaceParam}`;

        const description = `${truncatedContent}\n\n${point.amountSupporters || 0} supporters · ${point.cred || 0} cred · ${pointWithFavor.favor} favor · ${point.amountNegations || 0} negations`;

        const ogImageUrl = `${protocol}://${domain}/api/og/point/${encodedPointId}?space=${spaceParam}`;

        return {
            title,
            description,
            openGraph: {
                title,
                description,
                type: "article",
                authors: [point.author || "Unknown"],
                url: `/s/${spaceParam}/${encodedPointId}`,
                images: [{
                    url: ogImageUrl,
                    width: 1200,
                    height: 630,
                    alt: title
                }],
            },
            twitter: {
                card: "summary_large_image",
                title,
                description,
                creator: point.author || "Unknown",
                site: "@negationgame",
                images: [ogImageUrl],
            },
        };
    } catch (error) {
        console.error("Error generating metadata:", error);
        return {
            title: "Error Loading Point",
            description: "There was an error loading this point.",
        };
    }
}

export default function PointLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
} 