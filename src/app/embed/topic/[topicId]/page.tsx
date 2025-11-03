import { TopicEmbedClient } from './TopicEmbedClient';
import { fetchTopicById } from '@/actions/topics/fetchTopicById';
import { fetchTopicEmbedViewpoints } from '@/actions/viewpoints/fetchTopicEmbedViewpoints';
import { decodeId } from '@/lib/negation-game/decodeId';
import { notFound } from 'next/navigation';import { logger } from "@/lib/logger";

interface Props {
    params: Promise<{
        topicId: string;
    }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TopicEmbedPage({ params, searchParams }: Props) {
    const { topicId: rawTopicId } = await params;
    const sp = await searchParams;
    const preferredRationaleId = typeof sp.rationale === 'string' ? sp.rationale : Array.isArray(sp.rationale) ? sp.rationale[0] : undefined;

    // Handle both encoded IDs and raw numbers for testing
    let topicId: number;
    if (/^\d+$/.test(rawTopicId)) {
        // Raw number (for testing)
        topicId = parseInt(rawTopicId);
    } else {
        // Encoded ID (production)
        const decoded = decodeId(rawTopicId);
        if (!decoded) {
            notFound();
        }
        topicId = decoded;
    }

    try {
        const topic = await fetchTopicById(topicId);

        if (!topic) {
            notFound();
        }

        if (topic.space !== 'scroll') {
            notFound();
        }
        const rationales = await fetchTopicEmbedViewpoints('scroll', topicId, preferredRationaleId);

        return (
            <TopicEmbedClient
                topic={topic}
                rationales={rationales}
                preferredRationaleId={preferredRationaleId || undefined}
            />
        );
    } catch (error) {
        logger.error('Error loading embed topic:', error);
        notFound();
    }
}