import { Metadata } from "next";
import { fetchUser } from "@/actions/users/fetchUser";
import {
    truncateForSEO,
    extractKeywords,
    generateSEOTitle,
    cleanTextForSEO,
} from "@/lib/seo/utils";
import { generateBreadcrumbStructuredData } from "@/lib/seo/structuredData";
import { generateBreadcrumbs } from "@/lib/seo/utils";

interface Props {
    params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { username } = await params;

    if (!username) {
        return {
            title: "User Not Found",
            description: "The requested profile could not be found.",
            robots: {
                index: false,
                follow: false,
            },
        };
    }

    const user = await fetchUser(username);

    if (!user) {
        return {
            title: "User Not Found",
            description: `The profile for \"${username}\" does not exist.`,
            robots: {
                index: false,
                follow: false,
            },
        };
    }

    const cleanBio = cleanTextForSEO(user.bio ?? "");
    const bioKeywords = extractKeywords(cleanBio, 5);

    const title = generateSEOTitle(`${user.username}'s Profile`);
    const description = truncateForSEO(
        user.bio || `${user.username}'s activity and rationales on Negation Game.`,
        160,
    );

    const domain =
        process.env.NODE_ENV === "development"
            ? "localhost:3000"
            : process.env.NEXT_PUBLIC_DOMAIN || "negationgame.com";
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
    const baseUrl = `${protocol}://${domain}`;
    const canonicalUrl = new URL(`/profile/${user.username}`, baseUrl);

    const keywords = (
        [
            user.username.toLowerCase(),
            "profile",
            "negation game",
            "user",
            ...bioKeywords,
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
            type: "profile",
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

export default function ProfileLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ username: string }>;
}) {
    async function getStructuredData() {
        const { username } = await params;
        const user = await fetchUser(username);
        if (!user) return null;

        const domain =
            process.env.NODE_ENV === "development"
                ? "http://localhost:3000"
                : `https://${process.env.NEXT_PUBLIC_DOMAIN || "negationgame.com"}`;
        const canonicalUrl = `${domain}/profile/${user.username}`;

        const breadcrumbs = generateBreadcrumbs(`/profile/${user.username}`);
        const breadcrumbLd = generateBreadcrumbStructuredData({ breadcrumbs, domain });

        const personLd = {
            "@context": "https://schema.org",
            "@type": "Person",
            name: user.username,
            description: user.bio ?? undefined,
            url: canonicalUrl,
        } as const;

        return [personLd, breadcrumbLd] as const;
    }

    // Because Layout components can't be async directly, use a promise for the script.
    const structuredDataPromise = getStructuredData();

    return (
        <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {/** Inject JSON-LD when data is ready */}
            {
        /* @ts-ignore – async in client output */ structuredDataPromise.then(
                (sd) =>
                    sd && (
                        <script
                            key="profile-ld-json"
                            type="application/ld+json"
                            dangerouslySetInnerHTML={{ __html: JSON.stringify(sd) }}
                        />
                    ),
            )
            }
            {children}
        </>
    );
} 