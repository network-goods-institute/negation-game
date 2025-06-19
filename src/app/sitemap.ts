import { MetadataRoute } from "next";
import { db } from "@/services/db";
import { spacesTable } from "@/db/tables/spacesTable";
import { pointsTable } from "@/db/tables/pointsTable";
import { viewpointsTable } from "@/db/tables/viewpointsTable";
import { eq, desc } from "drizzle-orm";
import { sqids } from "@/services/sqids";
import {
  calculateDynamicPriority,
  calculateChangeFrequency,
} from "@/lib/seo/sitemapUtils";

// Revalidate sitemap every 12 hours so crawlers receive fresh data without DDoSing the DB
export const revalidate = 60 * 60 * 12;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const domain =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : `https://${process.env.NEXT_PUBLIC_DOMAIN || "negationgame.com"}`;

  const sitemapEntries: MetadataRoute.Sitemap = [];

  // Add home page
  sitemapEntries.push({
    url: domain,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 1,
  });

  try {
    // Add spaces
    const spaces = await db
      .select({
        id: spacesTable.id,
        updatedAt: spacesTable.updatedAt,
      })
      .from(spacesTable);

    for (const space of spaces) {
      sitemapEntries.push({
        url: `${domain}/s/${space.id}`,
        lastModified: space.updatedAt,
        changeFrequency: "daily",
        priority: 0.8,
      });
    }

    // Add points (limit to recent active points to avoid huge sitemaps)
    const recentPoints = await db
      .select({
        id: pointsTable.id,
        space: pointsTable.space,
        createdAt: pointsTable.createdAt,
      })
      .from(pointsTable)
      .where(eq(pointsTable.isActive, true))
      .orderBy(desc(pointsTable.createdAt))
      .limit(2000); // Increased limit for better coverage

    for (const point of recentPoints) {
      const encodedId = sqids.encode([point.id]);
      const daysSinceCreation = Math.floor(
        (Date.now() - point.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      sitemapEntries.push({
        url: `${domain}/s/${point.space}/${encodedId}`,
        lastModified: point.createdAt,
        changeFrequency: calculateChangeFrequency(daysSinceCreation),
        priority: calculateDynamicPriority({
          baseScore: 0.7,
          daysSinceCreation,
        }),
      });
    }

    // Add rationales (viewpoints)
    const recentRationales = await db
      .select({
        id: viewpointsTable.id,
        space: viewpointsTable.space,
        lastUpdatedAt: viewpointsTable.lastUpdatedAt,
        createdAt: viewpointsTable.createdAt,
      })
      .from(viewpointsTable)
      .where(eq(viewpointsTable.isActive, true))
      .orderBy(desc(viewpointsTable.lastUpdatedAt))
      .limit(1000); // Increased limit for better coverage

    for (const rationale of recentRationales) {
      if (rationale.space) {
        const lastUpdate = rationale.lastUpdatedAt || rationale.createdAt;
        const daysSinceCreation = Math.floor(
          (Date.now() - rationale.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        const daysSinceUpdate = Math.floor(
          (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
        );

        sitemapEntries.push({
          url: `${domain}/s/${rationale.space}/rationale/${rationale.id}`,
          lastModified: lastUpdate,
          changeFrequency: calculateChangeFrequency(
            daysSinceCreation,
            daysSinceUpdate
          ),
          priority: calculateDynamicPriority({
            baseScore: 0.6,
            daysSinceCreation,
            daysSinceUpdate,
          }),
        });
      }
    }
  } catch (error) {
    console.error("Error generating sitemap:", error);
    // Return at least the home page if there's an error
  }

  // Enforce 50k URL limit
  const MAX_URLS = 49999;
  if (sitemapEntries.length > MAX_URLS) {
    return sitemapEntries.slice(0, MAX_URLS);
  }

  return sitemapEntries;
}

// NOTE: Currently Next.js Metadata sitemap route only returns a single file. To comply with the 50 000-URL limit we truncate.
// In the future we can promote chunkSitemap() and expose an index route.
