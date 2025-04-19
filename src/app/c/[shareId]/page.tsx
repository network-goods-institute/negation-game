import { getSharedChat } from "@/actions/chatSharingActions";
import SharedChatDisplay from "./SharedChatDisplay";
import { notFound } from 'next/navigation';
import type { Metadata, ResolvingMetadata } from 'next';

export async function generateMetadata(
    { params, searchParams }: {
        params: Promise<{ shareId: string }>;
        searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
    },
    parent: ResolvingMetadata
): Promise<Metadata> {
    const resolvedParams = params as unknown as { shareId: string };
    const title = `Shared Chat`;

    return {
        title: title,
    };
}

export default async function SharedChatPage({
    params,
    searchParams,
}: {
    params: Promise<{ shareId: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const resolvedParams = await params;

    const shareId = resolvedParams.shareId;
    console.log(`[SharedChatPage] Rendering for shareId:`, shareId);

    const chatData = await getSharedChat(shareId);

    if (!chatData) {
        notFound(); // Render 404 if chat not found or not shared
    }

    return (
        <div className="min-h-screen bg-muted/30 py-8 md:py-12">
            <div className="max-w-3xl mx-auto bg-background rounded-lg shadow-lg overflow-hidden border">
                <SharedChatDisplay title={chatData.title} messages={chatData.messages} />
            </div>
        </div>
    );
} 