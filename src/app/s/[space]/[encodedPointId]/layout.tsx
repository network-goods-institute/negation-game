import { Metadata } from "next";
import { db } from "@/services/db";
import { pointsWithDetailsView, usersTable } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { decodeId } from "@/lib/negation-game/decodeId";
import { addFavor } from "@/db/utils/addFavor";
import { getColumns } from "@/db/utils/getColumns";
import { truncateForSEO, extractKeywords, generateSEOTitle, cleanTextForSEO } from "@/lib/seo/utils";
import { generatePointStructuredData } from "@/lib/seo/structuredData";

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
        const space = spaceParam;

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

        // Use SEO utilities for optimized content
        const cleanContent = cleanTextForSEO(point.content || "");
        const contentKeywords = extractKeywords(cleanContent, 8);
        const spaceDisplayName = space.charAt(0).toUpperCase() + space.slice(1);

        // Generate SEO-optimized title
        const baseTitle = cleanContent.length > 60
            ? `${cleanContent.substring(0, 57)}...`
            : cleanContent;
        const title = generateSEOTitle(`${baseTitle} | ${pointWithFavor.favor} Favor | ${spaceDisplayName}`);

        // Generate optimized description
        const stats = `${point.amountSupporters || 0} supporters · ${point.cred || 0} cred · ${pointWithFavor.favor} favor · ${point.amountNegations || 0} negations`;
        const description = truncateForSEO(`${cleanContent} ${stats}`, 160);

        const baseUrl = `${protocol}://${domain}`;
        const ogImageUrl = `${baseUrl}/api/og/point/${encodedPointId}?space=${spaceParam}`;
        const canonicalUrl = new URL(`/s/${spaceParam}/${encodedPointId}`, baseUrl);

        // Generate keywords combining content keywords with space-specific terms
        const keywords = (
            [
                ...contentKeywords,
                spaceDisplayName.toLowerCase(),
                "discourse",
                "debate",
                "argument",
                "epistemic",
                "reasoning",
                "negation game",
            ] as const
        ).slice(0, 8);

        return {
            title,
            description,
            keywords,
            authors: [{ name: point.author || "Unknown" }],
            category: "discussion",
            alternates: {
                canonical: canonicalUrl,
            },
            openGraph: {
                title,
                description,
                type: "article",
                authors: [point.author || "Unknown"],
                url: canonicalUrl,
                publishedTime: point.createdAt?.toISOString(),
                section: `${spaceDisplayName} Space`,
                tags: keywords,
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
                creator: `@${point.author || "unknown"}`,
                site: "@negationgame",
                images: [ogImageUrl],
            },
            robots: {
                index: true,
                follow: true,
                googleBot: {
                    index: true,
                    follow: true,
                    "max-image-preview": "large",
                    "max-snippet": -1,
                },
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

export default async function PointLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ encodedPointId: string; space: string }>;
}) {
    // Generate structured data for the point
    try {
        const resolvedParams = await params;
        const { encodedPointId, space } = resolvedParams;
        const pointId = decodeId(encodedPointId);

        if (pointId !== null) {
            const points = await db
                .select({
                    content: pointsWithDetailsView.content,
                    createdBy: pointsWithDetailsView.createdBy,
                    createdAt: pointsWithDetailsView.createdAt,
                    author: usersTable.username,
                })
                .from(pointsWithDetailsView)
                .innerJoin(usersTable, eq(usersTable.id, pointsWithDetailsView.createdBy))
                .where(and(
                    eq(pointsWithDetailsView.pointId, pointId),
                    eq(pointsWithDetailsView.space, space)
                ))
                .limit(1);

            const point = points[0];

            if (point) {
                const favorResults = await addFavor([{ id: pointId }]);
                const pointWithFavor = favorResults[0];

                const domain = process.env.NODE_ENV === "development"
                    ? "http://localhost:3000"
                    : `https://${process.env.NEXT_PUBLIC_DOMAIN || "negationgame.com"}`;

                const structuredData = generatePointStructuredData({
                    content: point.content || "",
                    author: point.author,
                    createdAt: point.createdAt || new Date(),
                    pointId: encodedPointId,
                    space,
                    favor: pointWithFavor?.favor || 0,
                    domain,
                });

                return (
                    <>
                        <script
                            type="application/ld+json"
                            dangerouslySetInnerHTML={{
                                __html: JSON.stringify(structuredData),
                            }}
                        />
                        {children}
                    </>
                );
            }
        }
    } catch (error) {
        console.error("Error generating structured data:", error);
    }

    return children;
} 