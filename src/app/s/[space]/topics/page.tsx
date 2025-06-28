import { fetchTopics } from "@/actions/topics/fetchTopics";
import TopicsPageClient from "./TopicsPageClient";

interface PageProps {
    params: Promise<{ space: string }>;
}

export default async function TopicsPage({ params }: PageProps) {
    const { space } = await params;
    
    const topics = await fetchTopics(space);

    return (
        <TopicsPageClient 
            space={space}
            topics={topics}
        />
    );
}