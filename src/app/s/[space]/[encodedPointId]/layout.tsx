import { Metadata } from "next";
import { db } from "@/services/db";
import { pointsWithDetailsView, usersTable } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { DEFAULT_SPACE } from "@/constants/config";
import { decodeId } from "@/lib/decodeId";
import { addFavor } from "@/db/utils/addFavor";
import { getColumns } from "@/db/utils/getColumns";

interface Props {
    params: Promise<{
        encodedPointId: string;
        space: string;
    }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { encodedPointId, space: spaceParam } = await params;
    const pointId = decodeId(encodedPointId);
    const space = spaceParam === DEFAULT_SPACE ? DEFAULT_SPACE : spaceParam;

    // Domain handling for development and production
    const domain = process.env.NODE_ENV === "development"
        ? "localhost:3000"
        : process.env.NEXT_PUBLIC_DOMAIN || "negationgame.com";
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https";

    const point = await db
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
        .limit(1)
        .then(results => results[0]);

    if (!point) {
        return {
            title: "Point Not Found",
            description: `The requested point could not be found in s/${spaceParam}.`,
        };
    }

    const [pointWithFavor] = await addFavor([{ id: point.pointId }]);

    const truncatedContent = point.content.length > 200
        ? point.content.substring(0, 197) + "..."
        : point.content;

    const title = `${point.content} | ${pointWithFavor.favor} Favor | s/${spaceParam}`;

    const description = `${truncatedContent}\n\n${point.amountSupporters} supporters · ${point.cred} cred · ${pointWithFavor.favor} favor · ${point.amountNegations} negations`;

    const ogImageUrl = `${protocol}://${domain}/api/og/point/${encodedPointId}?space=${spaceParam}`;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: "article",
            authors: [point.author],
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
            creator: point.author,
            site: "@negationgame",
            images: [ogImageUrl],
        },
    };
}

export default function PointLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
} 