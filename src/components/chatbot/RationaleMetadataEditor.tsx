import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AutosizeTextarea } from '@/components/ui/autosize-textarea';
import { X, LinkIcon, FileText } from 'lucide-react';
import TopicSelector from '@/components/TopicSelector';

interface RationaleMetadataEditorProps {
    currentSpace: string | null;
    topic: string;
    onTopicChange: (topic: string) => void;
    linkUrl: string;
    onLinkUrlChange: (url: string) => void;
    description: string;
    onDescriptionChange: (desc: string) => void;
    onClose: () => void;
}

export function RationaleMetadataEditor({
    currentSpace,
    topic,
    onTopicChange,
    linkUrl,
    onLinkUrlChange,
    description,
    onDescriptionChange,
    onClose,
}: RationaleMetadataEditorProps) {
    return (
        <div className="absolute top-14 left-0 right-0 z-20 bg-background border-b p-4 space-y-4">
            <div className="absolute top-[-6px] right-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="text-muted-foreground hover:text-foreground hover:bg-transparent"
                >
                    <X className="h-5 w-5" />
                </Button>
            </div>
            <TopicSelector
                currentSpace={currentSpace || ''}
                value={topic}
                onChange={onTopicChange}
                wrapperClassName="flex flex-col gap-1"
                triggerClassName="w-full"
                showLabel={false}
            />
            <div className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-muted-foreground" />
                <Input
                    type="url"
                    placeholder="Paste Scroll or Discourse Link (optional)"
                    value={linkUrl}
                    onChange={(e) => onLinkUrlChange(e.target.value)}
                    className="text-sm w-full"
                />
            </div>
            <div className="flex items-start gap-2">
                <FileText className="h-5 w-5 mt-1 text-muted-foreground" />
                <AutosizeTextarea
                    value={description}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                    placeholder="Enter rationale description..."
                    className="flex-1 rounded-md border shadow-sm px-3 py-2 text-sm"
                    minHeight={80}
                />
            </div>
        </div>
    );
} 