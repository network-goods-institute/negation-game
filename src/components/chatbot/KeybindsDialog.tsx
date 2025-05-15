import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface KeybindsDialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export const KeybindsDialog: React.FC<KeybindsDialogProps> = ({ open, onOpenChange }) => {
    const shortcuts = [
        { keys: 'Ctrl/Cmd + Enter', description: 'Send message or submit in dialogs' },
        { keys: 'Enter', description: 'Send message in chat (without Shift)' },
        { keys: 'Shift + Enter', description: 'Add a new line in chat' },
        { keys: 'Space', description: 'Activate focused card (e.g., open a rationale card)' },
        { keys: 'Ctrl/Cmd + Click', description: 'Raw copy in chat / scroll graph node into view' },
        { keys: 'Alt + Click', description: 'Submit negation without reviewing' },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Keyboard Shortcuts</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 pt-2">
                    {shortcuts.map(({ keys, description }) => (
                        <div key={keys} className="flex justify-between">
                            <span className="font-mono text-sm text-foreground">{keys}</span>
                            <span className="text-sm text-muted-foreground">{description}</span>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}; 