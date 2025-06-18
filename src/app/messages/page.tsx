import { Suspense } from "react";
import Link from "next/link";
import { MessagesContainer } from "@/components/messages/MessagesContainer";
import { UserSearch } from "@/components/messages/UserSearch";
import { Button } from "@/components/ui/button";
import { LoaderCircleIcon, ArrowLeftIcon } from "lucide-react";

export default function MessagesPage() {
    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto max-w-6xl py-8">
                <div className="mb-8 space-y-3">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" asChild className="shrink-0">
                            <Link href="/" className="flex items-center gap-2">
                                <ArrowLeftIcon className="size-4" />
                                <span className="hidden sm:inline">Back</span>
                            </Link>
                        </Button>
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
                            <p className="text-muted-foreground text-lg">
                                Your conversations with other users
                            </p>
                        </div>
                    </div>
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