import { Metadata } from "next";
import { db } from "@/services/db";
import { viewpointsTable, usersTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { truncateForSEO, extractKeywords, generateSEOTitle, cleanTextForSEO } from "@/lib/seo/utils";
import { generateRationaleStructuredData } from "@/lib/seo/structuredData";

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

        const space = spaceParam;

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
                lastUpdatedAt: viewpointsTable.lastUpdatedAt,
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

        // Use SEO utilities for optimized content
        const cleanTitle = cleanTextForSEO(viewpoint.title);
        const cleanDescription = cleanTextForSEO(viewpoint.description || "");
        const combinedContent = `${cleanTitle} ${cleanDescription}`;
        const contentKeywords = extractKeywords(combinedContent, 8);
        const spaceDisplayName = space.charAt(0).toUpperCase() + space.slice(1);

        // Generate SEO-optimized title
        const title = generateSEOTitle(`${cleanTitle} | ${spaceDisplayName} Rationale`);

        // Generate optimized description
        const description = truncateForSEO(cleanDescription || `A structured rationale by ${viewpoint.author} in the ${spaceDisplayName} space on Negation Game.`, 160);

        const domain = process.env.NODE_ENV === "development"
            ? "localhost:3000"
            : process.env.NEXT_PUBLIC_DOMAIN || "negationgame.com";
        const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
        const baseUrl = `${protocol}://${domain}`;
        const canonicalUrl = new URL(`/s/${spaceParam}/rationale/${rationaleId}`, baseUrl);

        // Generate keywords combining content keywords with rationale-specific terms
        const keywords = (
            [
                ...contentKeywords,
                spaceDisplayName.toLowerCase(),
                "rationale",
                "viewpoint",
                "structured argument",
                "reasoning",
                "epistemic discourse",
                "negation game",
            ] as const
        ).slice(0, 8);

        return {
            title,
            description,
            keywords,
            authors: [{ name: viewpoint.author }],
            category: "reasoning",
            alternates: {
                canonical: canonicalUrl,
            },
            openGraph: {
                title,
                description,
                type: "article",
                authors: [viewpoint.author],
                url: canonicalUrl,
                publishedTime: viewpoint.createdAt?.toISOString(),
                modifiedTime: viewpoint.lastUpdatedAt?.toISOString(),
                section: `${spaceDisplayName} Rationales`,
                tags: keywords,
                images: [
                    {
                        url: "/img/negation-game.png",
                        width: 1200,
                        height: 630,
                        alt: title,
                    },
                ],
            },
            twitter: {
                card: "summary_large_image",
                title,
                description,
                creator: `@${viewpoint.author}`,
                site: "@negationgame",
                images: ["/img/negation-game.png"],
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
        console.error("Error generating metadata for rationale:", error);
        return {
            title: "Error Loading Rationale",
            description: "There was an error loading this rationale.",
        };
    }
}

export default async function RationaleLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ rationaleId: string; space: string }>;
}) {
    // Generate structured data for the rationale
    try {
        const resolvedParams = await params;
        const { rationaleId, space } = resolvedParams;

        const viewpoints = await db
            .select({
                title: viewpointsTable.title,
                description: viewpointsTable.description,
                createdAt: viewpointsTable.createdAt,
                lastUpdatedAt: viewpointsTable.lastUpdatedAt,
                author: usersTable.username,
            })
            .from(viewpointsTable)
            .innerJoin(usersTable, eq(usersTable.id, viewpointsTable.createdBy))
            .where(
                and(
                    eq(viewpointsTable.id, rationaleId),
                    eq(viewpointsTable.space, space)
                )
            )
            .limit(1);

        const viewpoint = viewpoints[0];

        if (viewpoint) {
            const domain = process.env.NODE_ENV === "development"
                ? "http://localhost:3000"
                : `https://${process.env.NEXT_PUBLIC_DOMAIN || "negationgame.com"}`;

            const structuredData = generateRationaleStructuredData({
                title: viewpoint.title,
                description: viewpoint.description || "",
                author: viewpoint.author,
                createdAt: viewpoint.createdAt || new Date(),
                lastUpdatedAt: viewpoint.lastUpdatedAt || undefined,
                rationaleId,
                space,
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
    } catch (error) {
        console.error("Error generating structured data for rationale:", error);
    }

    return children;
}
