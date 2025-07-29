import { Suspense } from "react";
import Link from "next/link";
import { ConversationView } from "@/components/messages/ConversationView";
import { Button } from "@/components/ui/button";
import { LoaderCircleIcon, ArrowLeftIcon } from "lucide-react";

interface SpaceConversationPageProps {
  params: Promise<{ 
    space: string;
    username: string;
  }>;
}

export default async function SpaceConversationPage({ params }: SpaceConversationPageProps) {
  const { space, username: rawUsername } = await params;
  const spaceId = decodeURIComponent(space);
  const username = decodeURIComponent(rawUsername);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl py-8">
        <div className="mb-8 space-y-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild className="shrink-0">
              <Link href={`/s/${space}/messages`} className="flex items-center gap-2">
                <ArrowLeftIcon className="size-4" />
                <span className="hidden sm:inline">Back</span>
              </Link>
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight">
                Conversation with @{username}
              </h1>
              <p className="text-muted-foreground text-lg">
                In space: {spaceId}
              </p>
            </div>
          </div>
        </div>

        <Suspense
          fallback={
            <div className="flex items-center justify-center p-16">
              <div className="flex flex-col items-center gap-3">
                <LoaderCircleIcon className="animate-spin size-8 text-primary" />
                <p className="text-muted-foreground">Loading conversation...</p>
              </div>
            </div>
          }
        >
          <ConversationView username={username} spaceId={spaceId} />
        </Suspense>
      </div>
    </div>
  );
}