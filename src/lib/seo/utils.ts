/**
 * Utility functions for SEO optimization
 */

/**
 * Generate canonical URL for the current environment
 */
export function getCanonicalUrl(path: string): string {
  const domain =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : `https://${process.env.NEXT_PUBLIC_DOMAIN || "negationgame.com"}`;

  return `${domain}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Truncate text for SEO meta descriptions with proper word boundaries
 */
export function truncateForSEO(text: string, maxLength: number = 160): string {
  if (text.length <= maxLength) {
    return text;
  }

  const truncated = text.substring(0, maxLength - 3);
  const lastSpace = truncated.lastIndexOf(" ");

  // If we can't find a space, just truncate at the limit
  if (lastSpace === -1) {
    return `${truncated}...`;
  }

  return `${truncated.substring(0, lastSpace)}...`;
}

/**
 * Clean and optimize text content for SEO
 */
export function cleanTextForSEO(text: string): string {
  return (
    text
      // Remove excessive whitespace
      .replace(/\s+/g, " ")
      // Remove markdown links but keep the text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Remove other markdown formatting
      .replace(/[*_`#]/g, "")
      // Trim
      .trim()
  );
}

/**
 * Generate keywords from content
 */
export function extractKeywords(
  content: string,
  maxKeywords: number = 10
): string[] {
  const commonWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "this",
    "that",
    "these",
    "those",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "must",
    "can",
    "cannot",
    "should",
    "shall",
    "it",
    "its",
    "they",
    "them",
    "their",
    "i",
    "me",
    "my",
    "you",
    "your",
    "he",
    "him",
    "his",
    "she",
    "her",
    "we",
    "us",
    "our",
  ]);

  const words = cleanTextForSEO(content.toLowerCase())
    .split(/\s+/)
    .filter(
      (word) =>
        word.length > 2 && !commonWords.has(word) && /^[a-zA-Z]+$/.test(word)
    );

  // Count word frequency
  const wordCount = new Map<string, number>();
  words.forEach((word) => {
    wordCount.set(word, (wordCount.get(word) || 0) + 1);
  });

  // Sort by frequency and return top keywords
  return Array.from(wordCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

/**
 * Generate SEO-friendly title with proper length limits
 */
export function generateSEOTitle(
  title: string,
  siteName: string = "Negation Game",
  maxLength: number = 60
): string {
  const separator = " | ";
  const availableSpace = maxLength - siteName.length - separator.length;

  if (title.length <= availableSpace) {
    return `${title}${separator}${siteName}`;
  }

  const truncatedTitle = truncateForSEO(title, availableSpace).replace(
    "...",
    ""
  );
  return `${truncatedTitle}${separator}${siteName}`;
}

/**
 * Check if content is substantial enough for good SEO
 */
export function validateContentForSEO(content: string): {
  isValid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  const cleanContent = cleanTextForSEO(content);
  const wordCount = cleanContent.split(/\s+/).length;

  if (wordCount < 50) {
    warnings.push("Content is too short (less than 50 words)");
  }

  if (content.length < 200) {
    warnings.push("Content is less than 200 characters");
  }

  if (!/[.!?]/.test(content)) {
    warnings.push("Content lacks proper sentence structure");
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  };
}

/**
 * Generate breadcrumb data for navigation
 */
export function generateBreadcrumbs(
  path: string
): Array<{ name: string; url: string }> {
  const segments = path.split("/").filter(Boolean);
  const breadcrumbs = [{ name: "Home", url: "/" }];

  let currentPath = "";
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;

    // Format segment name
    let name = segment;
    if (segment.startsWith("s") && index === 0) {
      name = `${segment.substring(1).charAt(0).toUpperCase()}${segment.substring(2)} Space`;
    } else {
      name = segment.charAt(0).toUpperCase() + segment.slice(1);
    }

    breadcrumbs.push({
      name,
      url: currentPath,
    });
  });

  return breadcrumbs;
}

/**
 * Generate SEO-optimized meta keywords from content and context
 */
export function generateMetaKeywords({
  contentKeywords,
  contextKeywords,
  maxKeywords = 15,
}: {
  contentKeywords: string[];
  contextKeywords: string[];
  maxKeywords?: number;
}): string[] {
  const allKeywords = [...contentKeywords, ...contextKeywords];
  const uniqueKeywords = Array.from(new Set(allKeywords));
  return uniqueKeywords.slice(0, maxKeywords);
}

/**
 * Optimize URL for SEO (slugify)
 */
export function optimizeUrlSlug(text: string, maxLength: number = 50): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
    .substring(0, maxLength)
    .replace(/-+$/, ""); // Remove trailing hyphen if truncated
}

/**
 * Calculate reading time for content
 */
export function calculateReadingTime(content: string): {
  minutes: number;
  words: number;
} {
  const cleanContent = cleanTextForSEO(content);
  const words = cleanContent
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
  const wordsPerMinute = 200; // Average reading speed
  const minutes = Math.ceil(words / wordsPerMinute);

  return {
    minutes: Math.max(1, minutes),
    words,
  };
}

/**
 * Generate JSON-LD script tag content
 */
export function generateJsonLdScript(structuredData: any): string {
  return JSON.stringify(structuredData, null, 0);
}

/**
 * Validate and optimize Open Graph image URL
 */
export function optimizeOgImageUrl({
  baseUrl,
  title,
  description,
  type = "default",
}: {
  baseUrl: string;
  title?: string;
  description?: string;
  type?: string;
}): string {
  const params = new URLSearchParams();

  if (title) {
    params.set("title", truncateForSEO(title, 60));
  }

  if (description) {
    params.set("description", truncateForSEO(description, 120));
  }

  params.set("type", type);

  return `${baseUrl}?${params.toString()}`;
}
