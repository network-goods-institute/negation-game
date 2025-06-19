import { MetadataRoute } from "next";

/**
 * Calculate dynamic priority based on content metrics
 */
export function calculateDynamicPriority({
  baseScore,
  daysSinceCreation,
  daysSinceUpdate,
  engagementScore = 0,
}: {
  baseScore: number;
  daysSinceCreation: number;
  daysSinceUpdate?: number;
  engagementScore?: number;
}): number {
  // Start with base score
  let priority = baseScore;

  // Reduce priority based on age
  const ageDecay = Math.min(daysSinceCreation * 0.005, 0.3);
  priority -= ageDecay;

  // Factor in recent updates
  if (daysSinceUpdate !== undefined) {
    const updateBonus = Math.max(0, 0.1 - daysSinceUpdate * 0.01);
    priority += updateBonus;
  }

  // Factor in engagement (if available)
  priority += Math.min(engagementScore * 0.1, 0.2);

  // Ensure priority stays within valid range
  return Math.max(0.1, Math.min(1.0, Math.round(priority * 10) / 10));
}

/**
 * Determine change frequency based on content age and update patterns
 */
export function calculateChangeFrequency(
  daysSinceCreation: number,
  daysSinceUpdate?: number
): MetadataRoute.Sitemap[0]["changeFrequency"] {
  const recentUpdate =
    daysSinceUpdate !== undefined ? daysSinceUpdate : daysSinceCreation;

  if (recentUpdate < 1) return "hourly";
  if (recentUpdate < 7) return "daily";
  if (recentUpdate < 30) return "weekly";
  if (recentUpdate < 90) return "monthly";
  if (recentUpdate < 365) return "yearly";

  return "never";
}

/**
 * Generate sitemap index for large sites
 */
export function generateSitemapIndex({
  domain,
  sitemaps,
}: {
  domain: string;
  sitemaps: Array<{
    url: string;
    lastModified: Date;
  }>;
}): MetadataRoute.Sitemap {
  return sitemaps.map((sitemap) => ({
    url: `${domain}${sitemap.url}`,
    lastModified: sitemap.lastModified,
    changeFrequency: "daily",
    priority: 1.0,
  }));
}

/**
 * Split large sitemap into chunks for better performance
 */
export function chunkSitemap<T>(
  items: T[],
  maxItemsPerSitemap: number = 50000
): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += maxItemsPerSitemap) {
    chunks.push(items.slice(i, i + maxItemsPerSitemap));
  }

  return chunks;
}

/**
 * Generate robots.txt directives for sitemaps
 */
export function generateRobotsSitemapDirectives(
  domain: string,
  sitemapPaths: string[]
): string[] {
  return sitemapPaths.map((path) => `Sitemap: ${domain}${path}`);
}
