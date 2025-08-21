import TopicsPageClient from "./TopicsPageClient";

interface PageProps {
    params: Promise<{ space: string }>;
}

export default async function TopicsPage({ params }: PageProps) {
    const { space } = await params;
    return (
        <TopicsPageClient
            space={space}
        />
    );
}