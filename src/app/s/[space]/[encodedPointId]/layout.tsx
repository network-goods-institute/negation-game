import { Metadata } from "next";
import { decodeId } from "@/lib/negation-game/decodeId";
import { truncateForSEO, extractKeywords, generateSEOTitle, cleanTextForSEO } from "@/lib/seo/utils";
import { generatePointStructuredData } from "@/lib/seo/structuredData";
import { fetchPointSnapshots } from "@/actions/points/fetchPointSnapshots";import { logger } from "@/lib/logger";

interface Props {
  params: Promise<{
    encodedPointId: string;
    space: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { encodedPointId, space: spaceParam } = await params;

    if (!encodedPointId) {
      return {
        title: "Invalid Point ID",
        description: "The point ID is invalid or missing.",
      };
    }

    const pointId = decodeId(encodedPointId);
    if (pointId === null) {
      return {
        title: "Point Not Found",
        description: `The requested point could not be found in s/${spaceParam}.`,
      };
    }

    const [snapshot] = await fetchPointSnapshots([pointId]);
    if (!snapshot || snapshot.space !== spaceParam) {
      return {
        title: "Point Not Found",
        description: `The requested point could not be found in s/${spaceParam}.`,
      };
    }

    const domain =
      process.env.NODE_ENV === "development"
        ? "localhost:3000"
        : process.env.NEXT_PUBLIC_DOMAIN || "negationgame.com";
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https";

    const cleanContent = cleanTextForSEO(snapshot.content || "");
    const contentKeywords = extractKeywords(cleanContent, 8);
    const spaceDisplayName = spaceParam.charAt(0).toUpperCase() + spaceParam.slice(1);

    const baseTitle = cleanContent.length > 60 ? `${cleanContent.substring(0, 57)}...` : cleanContent;
    const title = generateSEOTitle(`${baseTitle} | ${spaceDisplayName}`);
    const description = truncateForSEO(cleanContent, 160);

    const baseUrl = `${protocol}://${domain}`;
    const ogImageUrl = `${baseUrl}/api/og/point/${encodedPointId}?space=${spaceParam}`;
    const canonicalUrl = new URL(`/s/${spaceParam}/${encodedPointId}`, baseUrl);

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

    const authorName = snapshot.authorUsername || "Unknown";

    return {
      title,
      description,
      keywords,
      authors: [{ name: authorName }],
      category: "discussion",
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title,
        description,
        type: "article",
        authors: [authorName],
        url: canonicalUrl,
        publishedTime: snapshot.createdAt?.toISOString(),
        section: `${spaceDisplayName} Space`,
        tags: keywords,
        images: [
          {
            url: ogImageUrl,
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
        creator: snapshot.authorUsername ? `@${snapshot.authorUsername}` : undefined,
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
    logger.error("Error generating metadata:", error);
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
  try {
    const { encodedPointId, space } = await params;
    const pointId = decodeId(encodedPointId);

    if (pointId !== null) {
      const [snapshot] = await fetchPointSnapshots([pointId]);

      if (snapshot && snapshot.space === space) {
        const domain =
          process.env.NODE_ENV === "development"
            ? "http://localhost:3000"
            : `https://${process.env.NEXT_PUBLIC_DOMAIN || "negationgame.com"}`;

        const structuredData = generatePointStructuredData({
          pointId: pointId.toString(),
          content: snapshot.content || "",
          author: snapshot.authorUsername || "Unknown",
          createdAt: snapshot.createdAt ?? new Date(),
          space,
          favor: 0,
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
    logger.error("Error generating structured data:", error);
  }

  return children;
}
