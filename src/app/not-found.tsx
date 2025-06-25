'use client';

import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Search } from "lucide-react";
import { useEffect } from 'react';

export default function NotFound() {
    useEffect(() => {
        document.title = "Page Not Found | Negation Game";

        const existingRobotsMeta = document.querySelector('meta[name="robots"]');
        if (existingRobotsMeta) {
            existingRobotsMeta.setAttribute('content', 'noindex, follow');
        } else {
            const robotsMeta = document.createElement('meta');
            robotsMeta.name = 'robots';
            robotsMeta.content = 'noindex, follow';
            document.head.appendChild(robotsMeta);
        }

        const existingDescMeta = document.querySelector('meta[name="description"]');
        if (existingDescMeta) {
            existingDescMeta.setAttribute('content', "The page you're looking for doesn't exist or has been moved.");
        } else {
            const descMeta = document.createElement('meta');
            descMeta.name = 'description';
            descMeta.content = "The page you're looking for doesn't exist or has been moved.";
            document.head.appendChild(descMeta);
        }
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
            <div className="max-w-md mx-auto">
                <h1 className="text-6xl font-bold text-muted-foreground mb-4">404</h1>
                <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
                <p className="text-lg text-muted-foreground mb-8">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button asChild>
                        <Link href="/">
                            <Home className="mr-2 h-4 w-4" />
                            Return Home
                        </Link>
                    </Button>

                    <Button variant="outline" onClick={() => window.history.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Go Back
                    </Button>

                    <Button variant="outline" asChild>
                        <Link href="/s/global">
                            <Search className="mr-2 h-4 w-4" />
                            Browse Discussions
                        </Link>
                    </Button>
                </div>

                <div className="mt-8 p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">
                        Popular sections:
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                        <Link href="/s/global" className="text-sm text-primary hover:underline">
                            Global Space
                        </Link>
                        <span className="text-muted-foreground">•</span>
                        <Link href="/s/scroll" className="text-sm text-primary hover:underline">
                            Scroll DAO
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
} 