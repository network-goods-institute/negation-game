import React from "react";
import { notFound } from "next/navigation";
import { decodeId } from "@/lib/negation-game/decodeId";
import { fetchTopicById } from "@/actions/topics/fetchTopicById";
import { fetchViewpointsByTopic } from "@/actions/viewpoints/fetchViewpointsByTopic";
import TopicPageClient from "@/app/s/[space]/topic/[topicId]/TopicPageClient";

interface PageProps {
    params: Promise<{ space: string; topicId: string }>;
}

export default async function Page({ params }: PageProps) {
    const { space, topicId: encodedTopicId } = await params;

    const topicIdNum = decodeId(encodedTopicId);
    if (topicIdNum === null) {
        return notFound();
    }

    const topic = await fetchTopicById(topicIdNum);
    if (!topic) {
        return notFound();
    }

    const viewpoints = await fetchViewpointsByTopic(space, topicIdNum);

    return (
        <TopicPageClient
            topic={{ id: topic.id, name: topic.name, discourseUrl: topic.discourseUrl }}
            viewpoints={viewpoints}
            space={space}
        />
    );
} 