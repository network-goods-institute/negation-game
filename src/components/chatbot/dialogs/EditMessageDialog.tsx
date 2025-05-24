import React, { useState, useEffect, FC } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AutosizeTextarea } from '@/components/ui/autosize-textarea';
import { Button } from '@/components/ui/button';
import { AuthenticatedActionButton } from '@/components/editor/AuthenticatedActionButton';

interface EditMessageDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialContent: string;
    onSave: (newContent: string) => void;
}

export const EditMessageDialog: FC<EditMessageDialogProps> = ({
    open,
    onOpenChange,
    initialContent,
    onSave,
}) => {
    const [content, setContent] = useState(initialContent);

    useEffect(() => {
        if (open) {
            setContent(initialContent);
        }
    }, [open, initialContent]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Message</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <AutosizeTextarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Edit your message..."
                        className="w-full min-h-[100px] rounded-md border px-3 py-2 text-sm"
                        minHeight={100}
                        maxHeight={300}
                        autoFocus
                    />
                </div>
                <div className="flex items-center justify-end space-x-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <AuthenticatedActionButton
                        onClick={() => {
                            onSave(content.trim());
                            onOpenChange(false);
                        }}
                        disabled={!content.trim()}
                    >
                        Save Changes
                    </AuthenticatedActionButton>
                </div>
            </DialogContent>
        </Dialog>
    );
}; 