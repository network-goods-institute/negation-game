'use client';

import {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
    useCallback,
} from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button';
import { useKnowledgeBase } from '@/components/contexts/KnowledgeBaseContext';
import { useWriteup } from '@/components/contexts/WriteupContext';
import { KeybindsDialog } from '@/components/dialogs/KeybindsDialog';
import { Library, FileText, Keyboard, PlayCircle } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'onboardingDismissed';
const LAST_SHOWN_KEY = 'onboardingLastShown';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface OnboardingContextType {
    isOpen: boolean;
    openDialog: () => void;
    closeDialog: (permanently?: boolean) => void;
    isPermanentlyDismissed: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(
    undefined,
);

export const useOnboarding = (): OnboardingContextType => {
    const context = useContext(OnboardingContext);
    if (context === undefined) throw new Error('useOnboarding must be used within an OnboardingProvider');
    return context;
};

export const useOptionalOnboarding = (): OnboardingContextType | undefined => {
    return useContext(OnboardingContext);
};

interface OnboardingDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onDismissPermanently: () => void;
}

const OnboardingDialog = ({ isOpen, onClose, onDismissPermanently }: OnboardingDialogProps) => {
    const { openDialog: openKbDialog } = useKnowledgeBase();
    const { openDialog: openWriteupDialog } = useWriteup();
    const [showKeybinds, setShowKeybinds] = useState(false);

    return (
        <>
            <KeybindsDialog open={showKeybinds} onOpenChange={setShowKeybinds} showBack />
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-w-md w-full">
                    <DialogHeader>
                        <DialogTitle>🚀 Welcome!</DialogTitle>
                        <p className="text-sm text-muted-foreground mt-1">Get started with the Negation Game</p>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 p-6">
                        <button
                            className="flex flex-col items-center p-4 bg-muted rounded-lg hover:bg-muted/80"
                            onClick={() => {
                                onClose();
                                openKbDialog(true);
                            }}
                        >
                            <Library className="h-6 w-6 mb-2" />
                            <span className="font-semibold">Knowledge Base</span>
                            <span className="text-xs text-muted-foreground text-center mt-1">Explore topics and concepts within the game</span>
                        </button>
                        <button
                            className="flex flex-col items-center p-4 bg-muted rounded-lg hover:bg-muted/80"
                            onClick={() => {
                                onClose();
                                openWriteupDialog(true);
                            }}
                        >
                            <FileText className="h-6 w-6 mb-2" />
                            <span className="font-semibold">Full Negation Game Write-up</span>
                            <span className="text-xs text-muted-foreground text-center mt-1">The full length introduction to the Negation Game</span>
                        </button>
                        <button
                            className="flex flex-col items-center p-4 bg-muted rounded-lg hover:bg-muted/80"
                            onClick={() => setShowKeybinds(true)}
                        >
                            <Keyboard className="h-6 w-6 mb-2" />
                            <span className="font-semibold">Keybinds</span>
                            <span className="text-xs text-muted-foreground text-center mt-1">Keyboard shortcuts</span>
                        </button>
                        <button
                            className="flex flex-col items-center p-4 bg-muted rounded-lg opacity-50 cursor-not-allowed"
                            disabled
                        >
                            <PlayCircle className="h-6 w-6 mb-2" />
                            <span className="font-semibold">Video Intro</span>
                            <span className="text-xs text-muted-foreground text-center mt-1">[Coming soon]</span>
                        </button>
                    </div>
                    <DialogFooter className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={onDismissPermanently}>
                            Don&apos;t show again
                        </Button>
                        <Button onClick={onClose}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isPermanentlyDismissed, setIsPermanentlyDismissed] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        const dismissed = localStorage.getItem(LOCAL_STORAGE_KEY) === 'true';
        setIsPermanentlyDismissed(dismissed);

        if (!dismissed) {
            const lastShown = localStorage.getItem(LAST_SHOWN_KEY);
            const now = Date.now();
            if (!lastShown || now - parseInt(lastShown, 10) > ONE_DAY_MS) {
                setIsOpen(true);
                localStorage.setItem(LAST_SHOWN_KEY, now.toString());
            }
        }
        setIsInitialized(true);
    }, []);

    const openDialog = useCallback(() => {
        if (isInitialized) setIsOpen(true);
    }, [isInitialized]);

    const closeDialog = useCallback(
        (permanently = false) => {
            setIsOpen(false);
            if (permanently && isInitialized) {
                localStorage.setItem(LOCAL_STORAGE_KEY, 'true');
                setIsPermanentlyDismissed(true);
                localStorage.setItem(LAST_SHOWN_KEY, Date.now().toString());
            }
        },
        [isInitialized]
    );

    const handleDismissPermanently = useCallback(() => closeDialog(true), [closeDialog]);

    const value: OnboardingContextType = {
        isOpen,
        openDialog,
        closeDialog,
        isPermanentlyDismissed,
    };

    return (
        <OnboardingContext.Provider value={value}>
            {children}
            {isInitialized && (
                <OnboardingDialog
                    isOpen={isOpen}
                    onClose={() => closeDialog(false)}
                    onDismissPermanently={handleDismissPermanently}
                />
            )}
        </OnboardingContext.Provider>
    );
};