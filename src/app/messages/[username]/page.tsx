import { Suspense } from "react";
import { ConversationView } from "@/components/messages/ConversationView";
import { LoaderCircleIcon } from "lucide-react";

interface ConversationPageProps {
    params: Promise<{ username: string }>;
}

export default async function ConversationPage({ params }: ConversationPageProps) {
    const { username } = await params;

    const decodedUsername = decodeURIComponent(username);

    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center h-screen">
                    <LoaderCircleIcon className="animate-spin size-6" />
                </div>
            }
        >
            <ConversationView otherUsername={decodedUsername} />
        </Suspense>
    );
} 