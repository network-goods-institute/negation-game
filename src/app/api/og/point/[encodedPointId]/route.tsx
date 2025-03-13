import { ImageResponse } from "next/og";
import { db } from "@/services/db";
import { pointsWithDetailsView, usersTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { decodeId } from "@/lib/decodeId";
import { addFavor } from "@/db/utils/addFavor";
import { DEFAULT_SPACE } from "@/constants/config";

export const runtime = "edge";

export async function GET(request: Request, { params }: { params: { encodedPointId: string } }) {
    const { encodedPointId } = params;
    const pointId = decodeId(encodedPointId);

    const url = new URL(request.url);
    const spaceParam = url.searchParams.get("space") || DEFAULT_SPACE;
    const space = spaceParam === DEFAULT_SPACE ? DEFAULT_SPACE : spaceParam;

    const point = await db
        .select({
            pointId: pointsWithDetailsView.pointId,
            content: pointsWithDetailsView.content,
            cred: pointsWithDetailsView.cred,
            amountSupporters: pointsWithDetailsView.amountSupporters,
            amountNegations: pointsWithDetailsView.amountNegations,
            author: usersTable.username,
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
        return new Response("Point not found", { status: 404 });
    }

    const [pointWithFavor] = await addFavor([{ id: point.pointId }]);

    return new ImageResponse(
        (
            <div
                style={{
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                    backgroundColor: '#030711',
                    padding: 48,
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        marginBottom: 24,
                    }}
                >
                    <div
                        style={{
                            fontSize: 48,
                            fontWeight: 700,
                            color: '#60A5FA',
                            marginBottom: 8,
                        }}
                    >
                        {pointWithFavor.favor}% favor
                    </div>
                    <div
                        style={{
                            fontSize: 32,
                            fontWeight: 600,
                            color: '#E5E7EB',
                            maxWidth: 900,
                        }}
                    >
                        {point.content}
                    </div>
                </div>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 24,
                        color: '#9CA3AF',
                        fontSize: 24,
                    }}
                >
                    <div>{point.amountSupporters} supporters</div>
                    <div>·</div>
                    <div>{point.cred} cred</div>
                    <div>·</div>
                    <div>{point.amountNegations} negations</div>
                </div>
            </div>
        ),
        {
            width: 1200,
            height: 630,
        }
    );
} 