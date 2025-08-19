import { Suspense } from "react";
import Link from "next/link";
import { MessagesContainer } from "@/components/messages/MessagesContainer";
import { UserSearch } from "@/components/messages/UserSearch";
import { Button } from "@/components/ui/button";
import { LoaderCircleIcon, ArrowLeftIcon } from "lucide-react";

interface SpaceMessagesPageProps {
  params: Promise<{ space: string }>;
}

export default async function SpaceMessagesPage({ params }: SpaceMessagesPageProps) {
  const { space } = await params;
  const spaceId = decodeURIComponent(space);

  return (
    <div className="h-[calc(100vh-var(--header-height))] bg-background flex flex-col overflow-hidden">
      {/* Sub-navigation bar positioned below main header (static) */}
      <div className="bg-card border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/s/${space}`} className="flex items-center space-x-2 text-muted-foreground hover:text-foreground">
                  <ArrowLeftIcon className="h-4 w-4" />
                  <span>Back to {spaceId}</span>
                </Link>
              </Button>
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-foreground">Messages</h1>
            </div>
            <div className="w-24"></div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-hidden">

          {/* Left Sidebar - New Conversation */}
          <div className="lg:col-span-1 flex flex-col h-full overflow-hidden">
            <div className="bg-card rounded-xl shadow-sm border border-border p-4 flex-shrink-0">
              <h2 className="text-base font-semibold text-card-foreground mb-3">Start New Conversation</h2>
              <UserSearch spaceId={spaceId} />
            </div>
          </div>

          {/* Right Content - Conversations List */}
          <div className="lg:col-span-2 flex flex-col h-full overflow-hidden">
            <div className="bg-card rounded-xl shadow-sm border border-border h-full flex flex-col overflow-hidden">
              <div className="p-4 border-b border-border flex-shrink-0">
                <h2 className="text-base font-semibold text-card-foreground">Your Conversations</h2>
              </div>
              <div className="flex-1 overflow-hidden p-6">
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-full">
                      <div className="flex flex-col items-center space-y-4">
                        <LoaderCircleIcon className="animate-spin h-8 w-8 text-primary" />
                        <p className="text-muted-foreground">Loading conversations...</p>
                      </div>
                    </div>
                  }
                >
                  <MessagesContainer spaceId={spaceId} />
                </Suspense>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}