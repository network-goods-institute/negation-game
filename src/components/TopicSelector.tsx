import React, { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useTopics } from "@/queries/useTopics";
import { createTopic } from "@/actions/createTopic";
import { DEFAULT_SPACE } from "@/constants/config";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (dialogOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
        } else {
            setNewTopic("");
        }
    }, [dialogOpen]);

    const handleAddTopic = async () => {
        if (!newTopic.trim()) return;
        setIsSubmitting(true);
        try {
            await createTopic(newTopic.trim(), currentSpace);
            await refetch();
            onChange(newTopic.trim());
            setDialogOpen(false);
        } finally {
            setIsSubmitting(false);
        }
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
                    {topics
                        ?.filter(t => t.name && t.name.trim() !== "")
                        .map((t) => (
                            <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                        ))}
                </SelectContent>
            </Select>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Topic</DialogTitle>
                    </DialogHeader>
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