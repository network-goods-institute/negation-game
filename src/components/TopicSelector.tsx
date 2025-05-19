import React, { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useTopics } from "@/queries/useTopics";
import { createTopic } from "@/actions/createTopic";
import { DEFAULT_SPACE } from "@/constants/config";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { validateAndFormatUrl } from "@/lib/validateUrl";

export interface TopicSelectorProps {
    currentSpace: string;
    value: string;
    onChange: (topic: string) => void;
    wrapperClassName?: string;
    triggerClassName?: string;
    showLabel?: boolean;
}

export const TopicSelector: React.FC<TopicSelectorProps> = ({
    currentSpace,
    value,
    onChange,
    wrapperClassName = "",
    triggerClassName = "",
    showLabel = true,
}) => {
    const { data: topics, refetch } = useTopics(currentSpace || DEFAULT_SPACE);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [newTopic, setNewTopic] = useState("");
    const [discourseUrl, setDiscourseUrl] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [urlError, setUrlError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (dialogOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
        } else {
            setNewTopic("");
            setDiscourseUrl("");
            setUrlError(null);
        }
    }, [dialogOpen]);

    const handleAddTopic = async () => {
        if (!newTopic.trim()) return;

        let formattedUrl = "";
        if (discourseUrl.trim()) {
            const validUrl = validateAndFormatUrl(discourseUrl.trim());
            if (!validUrl) {
                setUrlError("Please enter a valid URL");
                return;
            }
            formattedUrl = validUrl;
        }

        setIsSubmitting(true);
        try {
            await createTopic(newTopic.trim(), currentSpace, formattedUrl);
            await refetch();
            onChange(newTopic.trim());
            setDialogOpen(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDiscourseUrl(e.target.value);
        setUrlError(null);
    };

    return (
        <div className={wrapperClassName}>
            {showLabel && <Label className="text-sm font-medium">Topic</Label>}
            <Select
                value={value}
                onValueChange={(v) => {
                    if (v === "__new__") {
                        setDialogOpen(true);
                    } else {
                        onChange(v);
                    }
                }}
            >
                <SelectTrigger className={triggerClassName}>
                    <SelectValue placeholder="Select topic" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="__new__">+ Add new topic...</SelectItem>
                    <TooltipProvider>
                        {topics
                            ?.filter(t => t.name && t.name.trim() !== "")
                            .map((t) => {
                                const validUrl = t.discourseUrl ? validateAndFormatUrl(t.discourseUrl) : null;
                                return (
                                    <Tooltip key={t.id}>
                                        <TooltipTrigger asChild>
                                            <SelectItem
                                                value={t.name}
                                                className={validUrl ? "underline decoration-dotted" : ""}
                                                onClick={(e) => {
                                                    if (validUrl && (e.target as HTMLElement).tagName !== 'A') {
                                                        window.open(validUrl, '_blank');
                                                    }
                                                }}
                                            >
                                                {t.name}
                                            </SelectItem>
                                        </TooltipTrigger>
                                        {validUrl && (
                                            <TooltipContent side="right">
                                                Related: <a
                                                    href={validUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        window.open(validUrl, '_blank');
                                                    }}
                                                >
                                                    {validUrl}
                                                </a>
                                            </TooltipContent>
                                        )}
                                    </Tooltip>
                                );
                            })}
                    </TooltipProvider>
                </SelectContent>
            </Select>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Topic</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Topic Name</Label>
                            <Input
                                ref={inputRef}
                                value={newTopic}
                                onChange={e => setNewTopic(e.target.value)}
                                placeholder="Enter topic name"
                                onKeyDown={e => {
                                    if (e.key === "Enter" && newTopic.trim()) {
                                        handleAddTopic();
                                    }
                                }}
                                disabled={isSubmitting}
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Discourse URL (optional)</Label>
                            <Input
                                value={discourseUrl}
                                onChange={handleUrlChange}
                                placeholder="Enter discourse URL"
                                disabled={isSubmitting}
                            />
                            {urlError && (
                                <p className="text-sm text-destructive mt-1">{urlError}</p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddTopic} disabled={!newTopic.trim() || isSubmitting}>
                            Add
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TopicSelector; 