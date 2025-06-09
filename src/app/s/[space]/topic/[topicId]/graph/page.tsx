import React from "react";
import { notFound } from "next/navigation";
import { decodeId } from "@/lib/negation-game/decodeId";
import { fetchTopicById } from "@/actions/topics/fetchTopicById";
import TopicGraphPageClient from "./TopicGraphPageClient";

interface PageProps {
    params: Promise<{ space: string; topicId: string }>;
}

export default async function TopicGraphPage({ params }: PageProps) {
    const { space, topicId: encodedTopicId } = await params;

    const topicIdNum = decodeId(encodedTopicId);
    if (topicIdNum === null) {
        return notFound();
    }

    const topic = await fetchTopicById(topicIdNum);
    if (!topic) {
        return notFound();
    }

    return (
        <TopicGraphPageClient
            topic={{ id: topic.id, name: topic.name, discourseUrl: topic.discourseUrl }}
            space={space}
        />
    );
} 