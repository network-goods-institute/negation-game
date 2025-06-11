import { MessageSquareIcon } from "lucide-react";

export const EmptyMessages = () => {
    return (
        <div className="text-center p-8">
            <MessageSquareIcon className="mx-auto size-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No messages yet</h3>
            <p className="text-muted-foreground mb-4">
                Use the search bar above to find users and start a conversation,
                or visit someone&apos;s profile and click &quot;Send Message&quot;
            </p>
        </div>
    );
}; 