'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useOnboarding } from '@/components/contexts/OnboardingContext';
import { useState, useEffect } from 'react';
import { Loader } from '@/components/ui/loader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export interface VideoIntroDialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    showBack?: boolean;
}

export const VideoIntroDialog: React.FC<VideoIntroDialogProps> = ({ open, onOpenChange, showBack }) => {
    const { openDialog: openOnboarding } = useOnboarding();
    const [episode, setEpisode] = useState<1 | 2>(1);
    const [loaded, setLoaded] = useState<{ [key in 1 | 2]: boolean }>({ 1: false, 2: false });

    const srcMap: Record<number, string> = {
        1: 'https://www.youtube.com/embed/I69YBnZJ3QU',
        2: 'https://www.youtube.com/embed/d5CC7lnRZrM',
    };

    useEffect(() => {
        if (open) {
            setEpisode(showBack ? 2 : 1);
        }
    }, [open, showBack]);

    useEffect(() => {
        if (open) setLoaded(prev => ({ ...prev, [episode]: false }));
    }, [open, episode]);

    const episodes = [1, 2] as const;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl w-full">
                <DialogHeader>
                    <DialogTitle>Video Intro</DialogTitle>
                </DialogHeader>
                <Tabs value={episode.toString()} onValueChange={(val) => setEpisode(Number(val) as 1 | 2)}>
                    <TabsList>
                        <TabsTrigger value="1">Episode 1</TabsTrigger>
                        <TabsTrigger value="2">Episode 2</TabsTrigger>
                    </TabsList>
                    {episodes.map(ep => (
                        <TabsContent key={ep} value={ep.toString()} className="relative pb-[56.25%]">
                            {!loaded[ep] && (
                                <div className="absolute inset-0 flex items-center justify-center bg-background">
                                    <Loader />
                                </div>
                            )}
                            <iframe
                                src={srcMap[ep]}
                                frameBorder="0"
                                allow="autoplay; fullscreen; picture-in-picture"
                                className="absolute top-0 left-0 w-full h-full"
                                allowFullScreen
                                onLoad={() => setLoaded(prev => ({ ...prev, [ep]: true }))}
                            />
                        </TabsContent>
                    ))}
                </Tabs>
                <DialogFooter className="flex justify-end space-x-2 pt-4">
                    {showBack && (
                        <Button variant="outline" onClick={() => { onOpenChange?.(false); openOnboarding(); }}>
                            Back to Guide
                        </Button>
                    )}
                    <Button onClick={() => onOpenChange?.(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}; 