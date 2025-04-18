import React from 'react';
import { SourceCitation } from './SourceCitation';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { DiscourseMessage } from '@/components/chatbot/AIAssistant'; // Import DiscourseMessage type if not already globally available

interface MessageSource {
    type: string; // e.g., 'Rationale', 'Endorsed Point', 'Discourse Post'
    id: string | number;
}

interface MessageSourcesProps {
    sources: MessageSource[];
    space: string | null;
    discourseUrl: string;
    storedMessages: DiscourseMessage[];
}

export const MessageSources: React.FC<MessageSourcesProps> = ({
    sources,
    space,
    discourseUrl,
    storedMessages
}) => {
    if (!sources || sources.length === 0) {
        return null;
    }

    return (
        <Accordion type="single" collapsible className="w-full mt-2 border-t pt-2">
            <AccordionItem value="item-1" className="border-b-0">
                <AccordionTrigger className="text-xs text-muted-foreground hover:no-underline py-1">
                    View Sources ({sources.length})
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-0">
                    <div className="flex flex-wrap gap-2">
                        {sources.map((source, index) => {
                            // Attempt to find raw/html content specifically for Discourse posts
                            let rawContent: string | undefined = undefined;
                            let htmlContent: string | undefined = undefined;
                            if (source.type === 'Discourse Post') {
                                const message = storedMessages.find((m: DiscourseMessage) => String(m.id) === String(source.id));
                                rawContent = message?.raw;
                                htmlContent = message?.content;
                            }

                            return (
                                <SourceCitation
                                    key={`${source.type}-${source.id}-${index}`}
                                    type={source.type as any}
                                    id={String(source.id)}
                                    rawContent={rawContent}
                                    htmlContent={htmlContent}
                                    space={space ?? null}
                                    discourseUrl={discourseUrl}
                                />
                            );
                        })}
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}; 