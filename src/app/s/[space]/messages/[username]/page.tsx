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
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Fixed Top Navigation Bar */}
      <div className="flex-shrink-0 bg-card border-b border-border shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/s/${space}/messages`} className="flex items-center space-x-2 text-muted-foreground hover:text-foreground">
                  <ArrowLeftIcon className="h-4 w-4" />
                  <span>Back to Messages</span>
                </Link>
              </Button>
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-foreground">@{username}</h1>
              <p className="text-sm text-muted-foreground">{spaceId}</p>
            </div>
            <div className="w-32"></div>
          </div>
        </div>
      </div>

      {/* Chat Interface - Full Width */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-4xl mx-auto bg-card shadow-sm border-l border-r border-border">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center space-y-4">
                  <LoaderCircleIcon className="animate-spin h-8 w-8 text-primary" />
                  <p className="text-muted-foreground">Loading conversation...</p>
                </div>
              </div>
            }
          >
            <ConversationView username={username} spaceId={spaceId} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}