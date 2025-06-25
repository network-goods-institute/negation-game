import { MetadataRoute } from "next";
import { db } from "@/services/db";
import { spacesTable } from "@/db/tables/spacesTable";
import { pointsTable } from "@/db/tables/pointsTable";
import { viewpointsTable } from "@/db/tables/viewpointsTable";
import { eq, desc, and } from "drizzle-orm";
import { sqids } from "@/services/sqids";
import {
  calculateDynamicPriority,
  calculateChangeFrequency,
} from "@/lib/seo/sitemapUtils";

export const revalidate = 21600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const domain =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : `https://${process.env.NEXT_PUBLIC_DOMAIN || "negationgame.com"}`;

  const sitemapEntries: MetadataRoute.Sitemap = [];
  const now = new Date();

  sitemapEntries.push({
    url: domain,
    lastModified: now,
    changeFrequency: "daily",
    priority: 1,
  });

  try {
    // Add spaces with better error handling
    const spaces = await db
      .select({
        id: spacesTable.id,
        updatedAt: spacesTable.updatedAt,
        createdAt: spacesTable.createdAt,
      })
      .from(spacesTable)
      .catch((err) => {
        console.error("Error fetching spaces for sitemap:", err);
        return [];
      });

    for (const space of spaces) {
      sitemapEntries.push({
        url: `${domain}/s/${space.id}`,
        lastModified: space.updatedAt || space.createdAt || now,
        changeFrequency: "daily",
        priority: 0.8,
      });
    }

    const recentPoints = await db
      .select({
        id: pointsTable.id,
        space: pointsTable.space,
        createdAt: pointsTable.createdAt,
        content: pointsTable.content,
      })
      .from(pointsTable)
      .where(and(eq(pointsTable.isActive, true)))
      .orderBy(desc(pointsTable.createdAt))
      .limit(3000)
      .catch((err) => {
        console.error("Error fetching points for sitemap:", err);
        return [];
      });

    for (const point of recentPoints) {
      if (point.content && point.content.length < 10) continue;

      const encodedId = sqids.encode([point.id]);
      const lastModified = point.createdAt;
      const daysSinceCreation = Math.floor(
        (Date.now() - point.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      sitemapEntries.push({
        url: `${domain}/s/${point.space}/${encodedId}`,
        lastModified: lastModified,
        changeFrequency: calculateChangeFrequency(daysSinceCreation),
        priority: calculateDynamicPriority({
          baseScore: 0.7,
          daysSinceCreation,
          engagementScore: point.content?.length
            ? Math.min(point.content.length / 1000, 1)
            : 0,
        }),
      });
    }

    const recentRationales = await db
      .select({
        id: viewpointsTable.id,
        space: viewpointsTable.space,
        lastUpdatedAt: viewpointsTable.lastUpdatedAt,
        createdAt: viewpointsTable.createdAt,
        title: viewpointsTable.title,
        description: viewpointsTable.description,
      })
      .from(viewpointsTable)
      .where(eq(viewpointsTable.isActive, true))
      .orderBy(desc(viewpointsTable.lastUpdatedAt))
      .limit(1500)
      .catch((err) => {
        console.error("Error fetching rationales for sitemap:", err);
        return [];
      });

    for (const rationale of recentRationales) {
      if (rationale.space && rationale.title) {
        const totalContent =
          (rationale.title || "") + (rationale.description || "");
        if (totalContent.length < 20) continue;

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
            engagementScore: totalContent.length / 1000,
          }),
        });
      }
    }
  } catch (error) {
    console.error("Error generating sitemap:", error);
  }

  sitemapEntries.sort((a, b) => {
    if (a.priority !== b.priority) {
      return (b.priority || 0) - (a.priority || 0);
    }
    return (
      new Date(b.lastModified || 0).getTime() -
      new Date(a.lastModified || 0).getTime()
    );
  });

  // Enforce 50k URL limit
  const MAX_URLS = 49999;
  if (sitemapEntries.length > MAX_URLS) {
    return sitemapEntries.slice(0, MAX_URLS);
  }

  return sitemapEntries;
}

// NOTE: Currently Next.js Metadata sitemap route only returns a single file. To comply with the 50 000-URL limit we truncate.
// In the future we can promote chunkSitemap() and expose an index route.
