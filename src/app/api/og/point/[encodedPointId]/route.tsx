import { ImageResponse } from "next/og";
import { decodeId } from "@/lib/decodeId";
import { DEFAULT_SPACE } from "@/constants/config";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
    // Get encodedPointId from the URL path
    const encodedPointId = request.url.split('/').pop()?.split('?')[0];
    if (!encodedPointId) {
        return new Response("Invalid point ID", { status: 400 });
    }

    const pointId = decodeId(encodedPointId);
    const url = new URL(request.url);
    const spaceParam = url.searchParams.get("space") || DEFAULT_SPACE;
    const space = spaceParam === DEFAULT_SPACE ? DEFAULT_SPACE : spaceParam;

    // Get the base URL from the request
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    // Fetch point data from the API
    const pointDataResponse = await fetch(
        `${baseUrl}/api/og/data?pointId=${pointId}&space=${space}`,
        { cache: 'no-store' }
    );

    if (!pointDataResponse.ok) {
        return new Response("Point not found", { status: 404 });
    }

    const pointData = await pointDataResponse.json();

    // Calculate graph dimensions
    const graphWidth = 1000;
    const graphHeight = 200;
    const graphPadding = 20;

    // Create graph points
    const points = pointData.favorHistory.map((point: any, index: number, array: any[]) => {
        const x = (index / (array.length - 1)) * (graphWidth - 2 * graphPadding) + graphPadding;
        const y = graphHeight - (point.favor / 100) * (graphHeight - 2 * graphPadding) - graphPadding;

        if (index < array.length - 1) {
            const nextPoint = array[index + 1];
            const nextX = ((index + 1) / (array.length - 1)) * (graphWidth - 2 * graphPadding) + graphPadding;
            const nextY = graphHeight - (nextPoint.favor / 100) * (graphHeight - 2 * graphPadding) - graphPadding;
            // First draw horizontal line at current value, then vertical to next value
            return `${x},${y} ${nextX},${y} ${nextX},${nextY}`;
        }
        // For the last point, just return the point
        return `${x},${y}`;
    }).join(' ');

    // Create the animated ping effect for the last point
    const lastPoint = pointData.favorHistory[pointData.favorHistory.length - 1];
    const lastX = graphWidth - graphPadding;
    const lastY = graphHeight - (lastPoint.favor / 100) * (graphHeight - 2 * graphPadding) - graphPadding;

    return new ImageResponse(
        (
            <div
                style={{
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#030711',
                    padding: 48,
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 24,
                        marginBottom: 40,
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            fontSize: 48,
                            fontWeight: 700,
                            color: '#60A5FA',
                            alignItems: 'center',
                            gap: 12,
                        }}
                    >
                        <span>{pointData.favor}</span>
                        <span style={{ fontSize: 32 }}>favor</span>
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            fontSize: 32,
                            fontWeight: 600,
                            color: '#E5E7EB',
                            maxWidth: 800,
                        }}
                    >
                        {pointData.content}
                    </div>
                </div>

                {/* Favor Timeline Graph */}
                <div
                    style={{
                        display: 'flex',
                        width: graphWidth,
                        height: graphHeight,
                        marginBottom: 40,
                        position: 'relative',
                    }}
                >
                    <svg width={graphWidth} height={graphHeight}>
                        {/* Graph background */}
                        <rect
                            x="0"
                            y="0"
                            width={graphWidth}
                            height={graphHeight}
                            fill="#1F2937"
                            rx="4"
                        />
                        {/* Reference line at 50% */}
                        <line
                            x1="0"
                            y1={graphHeight / 2}
                            x2={graphWidth}
                            y2={graphHeight / 2}
                            stroke="#4B5563"
                            strokeWidth="1"
                        />
                        {/* Favor line */}
                        <polyline
                            points={points}
                            fill="none"
                            stroke="#60A5FA"
                            strokeWidth="2"
                        />
                        {/* Last point dot */}
                        {pointData.favorHistory.length > 0 && (
                            <circle
                                cx={lastX}
                                cy={lastY}
                                r="4"
                                fill="#60A5FA"
                            />
                        )}
                    </svg>
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
                    <div style={{ display: 'flex' }}>{pointData.amountSupporters} supporters</div>
                    <div style={{ display: 'flex' }}>·</div>
                    <div style={{ display: 'flex' }}>{pointData.cred} cred</div>
                    <div style={{ display: 'flex' }}>·</div>
                    <div style={{ display: 'flex' }}>{pointData.amountNegations} negations</div>
                </div>
            </div>
        ),
        {
            width: 1200,
            height: 630,
        }
    );
} 