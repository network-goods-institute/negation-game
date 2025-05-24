import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DiscourseMessage } from "@/types/chat";

interface DiscourseMessagesDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    messages: DiscourseMessage[];
}

export function DiscourseMessagesDialog({ isOpen, onOpenChange, messages }: DiscourseMessagesDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>Discourse Messages</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-4">
                    <div className="space-y-4 py-4">
                        {messages.length === 0 ? (
                            <p className="text-center text-muted-foreground">No messages found</p>
                        ) : (
                            [...messages]
                                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                .map((message) => (
                                    <div key={message.id} className="border rounded-lg p-4 bg-card">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="space-y-1">
                                                {message.topic_title && (
                                                    <p className="text-sm font-medium">Topic: {message.topic_title}</p>
                                                )}
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(message.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="prose dark:prose-invert max-w-none text-sm mt-2">
                                            {/* WARNING: Only use dangerouslySetInnerHTML if the source (Discourse API) is trusted 
                                                 and properly sanitizes its HTML output. Consider using a sanitizer library if unsure. */}
                                            <div dangerouslySetInnerHTML={{ __html: message.content }} />
                                        </div>
                                    </div>
                                ))
                        )}
                    </div>
                </ScrollArea>
                <div className="flex justify-between pt-4 items-center">
                    <p className="text-xs text-muted-foreground">
                        {messages.length} messages sorted by newest first
                    </p>
                    <Button onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
} 