import { Suspense } from "react";
import { MessagesContainer } from "@/components/messages/MessagesContainer";
import { UserSearch } from "@/components/messages/UserSearch";
import { LoaderCircleIcon } from "lucide-react";

export default function MessagesPage() {
    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto max-w-6xl py-8">
                <div className="mb-8 space-y-3">
                    <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
                    <p className="text-muted-foreground text-lg">
                        Your conversations with other users
                    </p>
                </div>

                <div className="mb-8">
                    <UserSearch />
                </div>

                <Suspense
                    fallback={
                        <div className="flex items-center justify-center p-16">
                            <div className="flex flex-col items-center gap-3">
                                <LoaderCircleIcon className="animate-spin size-8 text-primary" />
                                <p className="text-muted-foreground">Loading conversations...</p>
                            </div>
                        </div>
                    }
                >
                    <MessagesContainer />
                </Suspense>
            </div>
        </div>
    );
} 