import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { generateBreadcrumbStructuredData } from "@/lib/seo/structuredData";
import { generateBreadcrumbs } from "@/lib/seo/utils";
import { VALID_SPACE_IDS } from "@/lib/negation-game/staticSpacesList";

interface Props {
  params: Promise<{ space: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const resolvedParams = await params;
    const { space } = resolvedParams;
    const normalizedSpace = space?.toLowerCase();

    if (!normalizedSpace) {
      return {
        title: "Space Not Found",
        description: "The requested space could not be found.",
      };
    }

    if (!VALID_SPACE_IDS.has(normalizedSpace)) {
      return {
        title: "Space Not Found",
        description: `The space "s/${normalizedSpace}" could not be found.`,
      };
    }

    // Create display name from space ID
    const displayName =
      normalizedSpace.charAt(0).toUpperCase() + normalizedSpace.slice(1);
    const title = `${displayName} Space`;
    const description = `Explore discussions and reasoned disagreement in the ${displayName} space on Negation Game. Join structured debates with economic incentives for intellectual honesty.`;

    const domain = process.env.NODE_ENV === "development"
      ? "localhost:3000"
      : process.env.NEXT_PUBLIC_DOMAIN || "negationgame.com";
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
    const baseUrl = `${protocol}://${domain}`;

    return {
      title,
      description,
      keywords: (
        [
          displayName,
          "discourse space",
          "reasoned disagreement",
          "structured debate",
          "epistemic discourse",
          "argument mapping",
          "intellectual honesty",
          "commitment mechanisms",
        ] as const
      ).slice(0, 8),
      openGraph: {
        title,
        description,
        type: "website",
        url: `/s/${normalizedSpace}`,
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
        site: "@negationgame",
        images: ["/img/negation-game.png"],
      },
      alternates: {
        canonical: new URL(`/s/${normalizedSpace}`, baseUrl),
      },
    };
  } catch (error) {
    console.error("Error generating space metadata:", error);
    return {
      title: "Error Loading Space",
      description: "There was an error loading this space.",
    };
  }
}

export default async function SpaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ space: string }>;
}) {
  const resolvedParams = await params;
  const normalizedSpace = resolvedParams.space?.toLowerCase();

  if (!normalizedSpace || !VALID_SPACE_IDS.has(normalizedSpace)) {
    return notFound();
  }

  /* Structured data */
  const domain =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : `https://${process.env.NEXT_PUBLIC_DOMAIN || "negationgame.com"}`;

  const breadcrumbs = generateBreadcrumbs(`/s/${normalizedSpace}`);
  const breadcrumbLd = generateBreadcrumbStructuredData({ breadcrumbs, domain });

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${normalizedSpace} Space`,
    description: `Discussions and rationales in the ${normalizedSpace} space on Negation Game`,
    url: `${domain}/s/${normalizedSpace}`,
  } as const;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([breadcrumbLd, collectionLd]),
        }}
      />
      {children}
    </>
  );
}
