import { Metadata } from "next";
import { decodeId } from "@/lib/negation-game/decodeId";
import { fetchTopicById } from "@/actions/topics/fetchTopicById";
import {
    truncateForSEO,
    extractKeywords,
    generateSEOTitle,
    cleanTextForSEO,
} from "@/lib/seo/utils";

interface Props {
    params: Promise<{ space: string; topicId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { space, topicId: encodedTopicId } = await params;

    const topicIdNum = decodeId(encodedTopicId);
    if (topicIdNum === null) {
        return {
            title: "Topic Not Found",
            description: "The requested topic could not be found.",
            robots: {
                index: false,
                follow: false,
            },
        };
    }

    const topic = await fetchTopicById(topicIdNum);
    if (!topic) {
        return {
            title: "Topic Not Found",
            description: `The requested topic could not be found in s/${space}.`,
            robots: {
                index: false,
                follow: false,
            },
        };
    }

    const cleanName = cleanTextForSEO(topic.name);
    const nameKeywords = extractKeywords(cleanName, 3);

    const title = generateSEOTitle(`${cleanName} | ${space} Topic`);
    const description = truncateForSEO(
        `Explore rationales and viewpoints related to ${topic.name} in the ${space} space on Negation Game.`,
        160,
    );

    const domain =
        process.env.NODE_ENV === "development"
            ? "localhost:3000"
            : process.env.NEXT_PUBLIC_DOMAIN || "negationgame.com";
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
    const baseUrl = `${protocol}://${domain}`;
    const canonicalUrl = new URL(`/s/${space}/topic/${encodedTopicId}`, baseUrl);

    const keywords = (
        [
            cleanName.toLowerCase(),
            space.toLowerCase(),
            "topic",
            "negation game",
            ...nameKeywords,
        ] as const
    ).slice(0, 8);

    return {
        title,
        description,
        keywords,
        alternates: {
            canonical: canonicalUrl,
        },
        openGraph: {
            title,
            description,
            type: "website",
            url: canonicalUrl.toString(),
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
            images: ["/img/negation-game.png"],
            site: "@negationgame",
        },
    };
}

export default function TopicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // We can't access params here synchronously; breadcrumb structured data handled in parent space layout already.
    return <>{children}</>;
} 