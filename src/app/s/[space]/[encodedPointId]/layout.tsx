import { Metadata } from "next";
import { db } from "@/services/db";
import { pointsWithDetailsView, usersTable } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { DEFAULT_SPACE } from "@/constants/config";
import { decodeId } from "@/lib/decodeId";
import { addFavor } from "@/db/utils/addFavor";

interface Props {
    params: {
        encodedPointId: string;
        space: string;
    };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const pointId = decodeId(params.encodedPointId);
    const space = params.space === DEFAULT_SPACE ? null : params.space;
    const point = await db
        .select({
            pointId: pointsWithDetailsView.pointId,
            content: pointsWithDetailsView.content,
            createdBy: pointsWithDetailsView.createdBy,
            createdAt: pointsWithDetailsView.createdAt,
            cred: pointsWithDetailsView.cred,
            amountSupporters: pointsWithDetailsView.amountSupporters,
            amountNegations: pointsWithDetailsView.amountNegations,
            author: usersTable.username,
            space: pointsWithDetailsView.space,
        })
        .from(pointsWithDetailsView)
        .innerJoin(usersTable, eq(usersTable.id, pointsWithDetailsView.createdBy))
        .where(and(
            eq(pointsWithDetailsView.pointId, pointId),
            space === null ? isNull(pointsWithDetailsView.space) : eq(pointsWithDetailsView.space, space)
        ))
        .limit(1)
        .then(results => results[0]);

    if (!point) {
        return {
            title: "Point Not Found",
            description: `The requested point could not be found in s/${params.space}.`,
        };
    }

    const [pointWithFavor] = await addFavor([{ id: point.pointId }]);

    const truncatedContent = point.content.length > 200
        ? point.content.substring(0, 197) + "..."
        : point.content;

    const title = `${point.content} | ${pointWithFavor.favor}% Favor | s/${params.space}`;

    const description = `${truncatedContent}\n\n${point.amountSupporters} supporters · ${point.cred} cred · ${pointWithFavor.favor}% favor · ${point.amountNegations} negations`;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: "article",
            authors: [point.author],
            url: `/s/${params.space}/${params.encodedPointId}`,
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            creator: point.author,
            site: "@negationgame",
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