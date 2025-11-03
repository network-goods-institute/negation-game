'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";import { logger } from "@/lib/logger";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        logger.error('Unhandled error:', error);
    }, [error]);

    useEffect(() => {
        const metaRobots = document.querySelector('meta[name="robots"]');
        if (metaRobots) {
            metaRobots.setAttribute('content', 'noindex, nofollow');
        } else {
            const newMeta = document.createElement('meta');
            newMeta.name = 'robots';
            newMeta.content = 'noindex, nofollow';
            document.head.appendChild(newMeta);
        }
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
            <h1 className="text-4xl font-bold mb-4">Something went wrong</h1>
            <p className="text-lg mb-8">
                {process.env.NODE_ENV === 'development'
                    ? `Error: ${error.message}`
                    : 'An unexpected error occurred'}
            </p>
            <div className="flex gap-4">
                <Button onClick={reset} variant="outline">
                    Try again
                </Button>
                <Button asChild>
                    <Link href="/">
                        Return Home
                    </Link>
                </Button>
            </div>
        </div>
    );
} 