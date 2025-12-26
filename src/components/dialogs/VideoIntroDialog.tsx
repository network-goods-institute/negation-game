'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useOnboarding } from '@/components/contexts/OnboardingContext';
import { useState, useEffect } from 'react';
import { Loader } from '@/components/ui/loader';
import { trackVideoLoaded } from '@/lib/analytics/trackers';
import { usePathname } from 'next/navigation';

export interface VideoIntroDialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    showBack?: boolean;
}

export const VideoIntroDialog: React.FC<VideoIntroDialogProps> = ({ open, onOpenChange, showBack }) => {
    const { openDialog: openOnboarding } = useOnboarding();
    const [loaded, setLoaded] = useState(false);
    const videoSrc = 'https://www.youtube-nocookie.com/embed/h81ED2ybWaQ?rel=0&modestbranding=1&playsinline=1';
    const pathname = usePathname();

    useEffect(() => {
        if (open) {
            setLoaded(false);
        }
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl w-full">
                <DialogHeader>
                    <DialogTitle>Watch Video Tutorial</DialogTitle>
                </DialogHeader>
                <div className="relative pb-[56.25%]">
                    {!loaded && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background">
                            <Loader />
                        </div>
                    )}
                    <iframe
                        src={videoSrc}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        className="absolute top-0 left-0 w-full h-full"
                        allowFullScreen
                        onLoad={() => {
                            setLoaded(true);
                            trackVideoLoaded({ pathname });
                        }}
                    />
                </div>
                <DialogFooter className="flex justify-end space-x-2 pt-4">
                    <Button onClick={() => onOpenChange?.(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}; 
