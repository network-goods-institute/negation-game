import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useOptionalOnboarding } from '@/components/contexts/OnboardingContext';

interface KeybindsDialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    showBack?: boolean;
}

export const KeybindsDialog: React.FC<KeybindsDialogProps> = ({ open, onOpenChange, showBack }) => {
    const onboarding = useOptionalOnboarding();
    const shortcuts = [
        { keys: 'Enter', description: 'Send message or submit in dialogs' },
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
                <DialogFooter className="flex justify-end space-x-2 pt-4">
                    {showBack && (
                        <Button variant="outline" onClick={() => { onOpenChange?.(false); onboarding?.openDialog(); }}>
                            Back to Guide
                        </Button>
                    )}
                    <Button onClick={() => onOpenChange?.(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}; 