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
import { VideoIntroDialog } from '@/components/dialogs/VideoIntroDialog';
import { Loader } from '@/components/ui/loader';
import { Library, FileText, Keyboard } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { usePrivy } from "@privy-io/react-auth";
import { useUser } from "@/queries/users/useUser";
import { isSyncHost } from "@/utils/hosts/syncPaths";

const LOCAL_STORAGE_KEY = 'onboardingDismissed';
const LAST_SHOWN_KEY = 'onboardingLastShown';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const AUTO_OPEN_ENABLED = false;

interface OnboardingContextType {
    isOpen: boolean;
    openDialog: () => void;
    closeDialog: (permanently?: boolean) => void;
    isPermanentlyDismissed: boolean;
    isVideoOpen: boolean;
    showVideo: () => void;
    closeVideo: () => void;
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

type OnboardingDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    onDismissPermanently: () => void;
};

const OnboardingDialog = ({ isOpen, onClose, onDismissPermanently }: OnboardingDialogProps) => {
    const { openDialog: openKbDialog } = useKnowledgeBase();
    const { openDialog: openWriteupDialog } = useWriteup();
    const [showKeybinds, setShowKeybinds] = useState(false);

    return (
        <>
            <KeybindsDialog open={showKeybinds} onOpenChange={setShowKeybinds} showBack />
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-w-2xl w-full max-h-[90vh] flex flex-col">
                    <div className="flex-1 overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>🚀 Welcome!</DialogTitle>
                            <p className="text-sm text-muted-foreground mt-1">Get started with the Negation Game</p>
                        </DialogHeader>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6">
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
                                className="col-span-1 sm:col-span-2 flex justify-center flex-col items-center p-4 bg-muted rounded-lg hover:bg-muted/80"
                                onClick={() => setShowKeybinds(true)}
                            >
                                <Keyboard className="h-6 w-6 mb-2" />
                                <span className="font-semibold">Keybinds</span>
                                <span className="text-xs text-muted-foreground text-center mt-1">Keyboard shortcuts</span>
                            </button>
                        </div>
                    </div>
                    <DialogFooter className="flex justify-end space-x-2 flex-shrink-0">
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
    const [isVideoOpen, setIsVideoOpen] = useState(false);
    const pathname = usePathname();
    const { user: privyUser } = usePrivy();
    const { data: appUser, isLoading: userLoading } = useUser(privyUser?.id);
    const suppressOnboarding = !!privyUser && !appUser; // new-user init state

    useEffect(() => {
        const host = typeof window !== 'undefined' ? window.location.host : '';
        const isOnSyncSubdomain = isSyncHost(host);
        const suppressed = pathname === '/' ||
            pathname.startsWith('/embed') ||
            pathname.startsWith('/experiment/rationale/multiplayer') ||
            pathname === '/privacy' ||
            pathname === '/tos' ||
            isOnSyncSubdomain;
        if (suppressed) {
            setIsInitialized(true);
            return;
        }

        const dismissed = localStorage.getItem(LOCAL_STORAGE_KEY) === 'true';
        setIsPermanentlyDismissed(dismissed);

        if (AUTO_OPEN_ENABLED && !dismissed && !suppressOnboarding && pathname !== '/') {
            const lastShown = localStorage.getItem(LAST_SHOWN_KEY);
            const now = Date.now();
            if (!lastShown || now - parseInt(lastShown, 10) > ONE_DAY_MS) {
                setIsOpen(true);
                localStorage.setItem(LAST_SHOWN_KEY, now.toString());
            }
        }
        setIsInitialized(true);
    }, [pathname, suppressOnboarding]);

    const openDialog = useCallback(() => {
        if (isInitialized && !suppressOnboarding) setIsOpen(true);
    }, [isInitialized, suppressOnboarding]);

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

    const showVideo = useCallback(() => {
        setIsVideoOpen(true);
    }, []);

    const closeVideo = useCallback(() => {
        setIsVideoOpen(false);
    }, []);

    const handleDismissPermanently = useCallback(() => closeDialog(true), [closeDialog]);

    const value: OnboardingContextType = {
        isOpen,
        openDialog,
        closeDialog,
        isPermanentlyDismissed,
        isVideoOpen,
        showVideo,
        closeVideo,
    };

    const host = typeof window !== 'undefined' ? window.location.host : '';
    const isOnSyncSubdomain = isSyncHost(host);
    const suppressed = pathname === '/' ||
        pathname.startsWith('/embed') ||
        pathname.startsWith('/experiment/rationale/multiplayer') ||
        pathname === '/privacy' ||
        pathname === '/tos' ||
        isOnSyncSubdomain;

    return (
        <OnboardingContext.Provider value={value}>
            {children}
            {isInitialized && !suppressOnboarding && (
                <>
                    <OnboardingDialog
                        isOpen={isOpen}
                        onClose={() => closeDialog(false)}
                        onDismissPermanently={handleDismissPermanently}
                    />
                    <VideoIntroDialog open={isVideoOpen} onOpenChange={setIsVideoOpen} />
                </>
            )}
        </OnboardingContext.Provider>
    );
};
