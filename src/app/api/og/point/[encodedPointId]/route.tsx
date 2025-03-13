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
                            display: 'flex',
                            fontSize: 48,
                            fontWeight: 700,
                            color: '#60A5FA',
                            marginBottom: 8,
                        }}
                    >
                        {pointData.favor} favor
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            fontSize: 32,
                            fontWeight: 600,
                            color: '#E5E7EB',
                            maxWidth: 900,
                        }}
                    >
                        {pointData.content}
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