"use client";

import { useState, useRef, useEffect } from "react";
import { LoaderIcon, InfoIcon, UsersIcon, TrendingUpIcon, TrendingDownIcon, MessageCircleIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { setPrivyToken } from "@/lib/privy/setPrivyToken";

type UserDelta = {
    userId: string;
    username: string;
    delta: number;
    totalEngagement: number;
};

type BulkDeltaResult = {
    mostSimilar: UserDelta[];
    mostDifferent: UserDelta[];
    totalUsers: number;
    totalEngaged: number;
    message?: string;
};

type DeltaComparisonType =
    | { type: "point"; pointId: number }
    | { type: "user"; userId: string; username: string }
    | { type: "rationale"; rationaleId: string }
    | { type: "topic"; topicId: number }
    | { type: "space"; spaceId: string };

interface DeltaComparisonWidgetProps {
    comparison: DeltaComparisonType;
    title: string;
    description: React.ReactNode;
    currentUserId?: string;
    spaceId?: string;
    className?: string;
}

export function DeltaComparisonWidget({
    comparison,
    title,
    description,
    currentUserId,
    spaceId,
    className = "",
}: DeltaComparisonWidgetProps) {
    const { login } = usePrivy();
    const [isOpen, setIsOpen] = useState(false);
    const [bulkResults, setBulkResults] = useState<BulkDeltaResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [isPositioned, setIsPositioned] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        function updatePosition() {
            if (isOpen && buttonRef.current) {
                const rect = buttonRef.current.getBoundingClientRect();

                const isVisible = rect.top >= 0 && rect.left >= 0 &&
                    rect.bottom <= window.innerHeight &&
                    rect.right <= window.innerWidth;

                if (!isVisible) {
                    setIsOpen(false);
                    return;
                }

                const newTop = rect.bottom + 12;
                const newLeft = rect.left + rect.width / 2 - 192; // 192 is half of 384px (w-96)

                setPosition({
                    top: newTop,
                    left: newLeft
                });

                // Ensure positioned state is set after a short delay to allow for DOM updates
                if (!isPositioned) {
                    setTimeout(() => setIsPositioned(true), 10);
                }
            }
        }

        updatePosition();

        if (isOpen) {
            setIsPositioned(false);

            const handleScroll = () => updatePosition();
            const handleResize = () => updatePosition();

            window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
            window.addEventListener('resize', handleResize, { passive: true });

            let element = buttonRef.current?.parentElement;
            const scrollableParents: Element[] = [];

            while (element && element !== document.body) {
                const computedStyle = window.getComputedStyle(element);
                const isScrollable = computedStyle.overflow === 'auto' ||
                    computedStyle.overflow === 'scroll' ||
                    computedStyle.overflowY === 'auto' ||
                    computedStyle.overflowY === 'scroll';

                if (isScrollable) {
                    scrollableParents.push(element);
                    element.addEventListener('scroll', handleScroll, { passive: true });
                }
                element = element.parentElement;
            }

            return () => {
                window.removeEventListener('scroll', handleScroll, { capture: true });
                window.removeEventListener('resize', handleResize);
                scrollableParents.forEach(parent => {
                    parent.removeEventListener('scroll', handleScroll);
                });
            };
        }
    }, [isOpen, isPositioned]);

    async function handleDiscover() {
        if (!currentUserId) return;
        setLoading(true);
        setBulkResults(null);

        try {
            let endpoint = "";
            let body: any = {
                referenceUserId: currentUserId,
                limit: 5,
            };

            switch (comparison.type) {
                case "point":
                    endpoint = "/api/delta/bulk";
                    body.rootPointId = comparison.pointId;
                    break;
                case "user":
                    endpoint = "/api/delta/user";
                    body.targetUserId = comparison.userId;
                    break;
                case "rationale":
                    endpoint = "/api/delta/rationale";
                    body.rationaleId = comparison.rationaleId;
                    break;
                case "topic":
                    endpoint = "/api/delta/topic";
                    body.topicId = comparison.topicId;
                    break;
                case "space":
                    endpoint = "/api/delta/space";
                    body.spaceId = comparison.spaceId;
                    break;
            }

            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(body),
            });

            if (res.status === 401) {
                const refreshed = await setPrivyToken();
                if (refreshed) {
                    return await handleDiscover();
                }
                login();
                return;
            }

            if (!res.ok) {
                throw new Error(`Request failed with status ${res.status}`);
            }

            const data = await res.json();
            setBulkResults({
                mostSimilar: data.mostSimilar ?? [],
                mostDifferent: data.mostDifferent ?? [],
                totalUsers: data.totalUsers ?? 0,
                totalEngaged: data.totalEngaged ?? 0,
                message: data.message ?? (data.error ? data.error : undefined),
            });
        } catch (err) {
            console.error(err);
            setBulkResults({
                mostSimilar: [],
                mostDifferent: [],
                totalUsers: 0,
                totalEngaged: 0,
                message: "Error loading results"
            });
        } finally {
            setLoading(false);
        }
    }

    function getDeltaBadgeColor(delta: number): string {
        if (delta <= 0.1) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
        if (delta <= 0.3) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
        if (delta <= 0.7) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
        if (delta <= 0.9) return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    }

    return (
        <div className={className}>
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <div className="relative flex justify-center">
                    <CollapsibleTrigger asChild>
                        <Button
                            ref={buttonRef}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2 h-8 text-xs"
                        >
                            <UsersIcon className="h-3 w-3" />
                            Δ-Compare
                            {isOpen ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />}
                        </Button>
                    </CollapsibleTrigger>

                    {isOpen && (
                        <div
                            className="fixed z-50 w-96 max-w-[calc(100vw-2rem)]"
                            style={{
                                top: position.top,
                                left: typeof window !== 'undefined'
                                    ? Math.max(16, Math.min(position.left, window.innerWidth - 384 - 16))
                                    : position.left,
                            }}
                        >
                            <Card className="border-2 shadow-lg max-h-[80vh] overflow-y-auto">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <UsersIcon className="h-4 w-4" />
                                        {title}
                                    </CardTitle>
                                    <CardDescription className="text-sm">
                                        {description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {!currentUserId && (
                                        <Alert>
                                            <InfoIcon className="h-4 w-4" />
                                            <AlertDescription>
                                                Please sign in to discover user alignment
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    <Button
                                        onClick={handleDiscover}
                                        disabled={!currentUserId || loading}
                                        className="w-full"
                                        size="sm"
                                    >
                                        {loading ? (
                                            <>
                                                <LoaderIcon className="animate-spin h-3 w-3 mr-2" />
                                                Analyzing...
                                            </>
                                        ) : (
                                            <>
                                                <UsersIcon className="h-3 w-3 mr-2" />
                                                Discover User Alignment
                                            </>
                                        )}
                                    </Button>

                                    {bulkResults && (
                                        <div className="space-y-4">
                                            {bulkResults.message && (
                                                <Alert>
                                                    <InfoIcon className="h-4 w-4" />
                                                    <AlertDescription className="text-sm">
                                                        {bulkResults.message}
                                                        {bulkResults.message.includes("being processed") && (
                                                            <div className="mt-2">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={handleDiscover}
                                                                    disabled={loading}
                                                                    className="text-xs h-6"
                                                                >
                                                                    {loading ? "Retrying..." : "Try Again"}
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </AlertDescription>
                                                </Alert>
                                            )}

                                            {bulkResults.totalUsers > 0 && (
                                                <div className="text-center text-xs text-muted-foreground">
                                                    Showing {(bulkResults.mostSimilar?.length || 0) + (bulkResults.mostDifferent?.length || 0)} of {bulkResults.totalUsers} comparable users
                                                </div>
                                            )}

                                            {/* Score explanation */}
                                            <div className="bg-muted/50 rounded-md p-3 text-xs">
                                                <h5 className="font-medium mb-1">Δ-Score Guide:</h5>
                                                <div className="space-y-0.5 text-muted-foreground">
                                                    <div>• <strong>Δ = 0:</strong> Perfect agreement</div>
                                                    <div>• <strong>Δ ≤ 0.1:</strong> Strong agreement</div>
                                                    <div>• <strong>Δ ≤ 0.3:</strong> Mild agreement</div>
                                                    <div>• <strong>Δ = 0.5:</strong> Moderate disagreement</div>
                                                    <div>• <strong>Δ ≤ 0.9:</strong> Strong disagreement</div>
                                                    <div>• <strong>Δ = 1:</strong> Maximum disagreement</div>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                {/* Most Similar Users */}
                                                {bulkResults?.mostSimilar?.length > 0 && (
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <TrendingUpIcon className="h-4 w-4 text-green-600" />
                                                            <h4 className="text-sm font-medium">Most Similar</h4>
                                                        </div>
                                                        <div className="space-y-2">
                                                            {bulkResults.mostSimilar.map((user) => (
                                                                <div key={user.userId} className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm">
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="font-medium truncate">{user.username}</p>
                                                                        <p className="text-xs text-muted-foreground">
                                                                            {user.totalEngagement} engagement
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                                        <Badge className={`text-xs px-1.5 py-0.5 ${getDeltaBadgeColor(user.delta)}`}>
                                                                            {user.delta.toFixed(3)}
                                                                        </Badge>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            asChild
                                                                            className="h-6 w-6 p-0"
                                                                        >
                                                                            <Link href={`/s/${encodeURIComponent(spaceId || 'global')}/messages/${encodeURIComponent(user.username)}`}>
                                                                                <MessageCircleIcon className="h-3 w-3" />
                                                                                <span className="sr-only">Message {user.username}</span>
                                                                            </Link>
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Most Different Users */}
                                                {bulkResults?.mostDifferent?.length > 0 && (
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <TrendingDownIcon className="h-4 w-4 text-red-600" />
                                                            <h4 className="text-sm font-medium">Most Different</h4>
                                                        </div>
                                                        <div className="space-y-2">
                                                            {bulkResults.mostDifferent.map((user) => (
                                                                <div key={user.userId} className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm">
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="font-medium truncate">{user.username}</p>
                                                                        <p className="text-xs text-muted-foreground">
                                                                            {user.totalEngagement} engagement
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                                        <Badge className={`text-xs px-1.5 py-0.5 ${getDeltaBadgeColor(user.delta)}`}>
                                                                            {user.delta.toFixed(3)}
                                                                        </Badge>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            asChild
                                                                            className="h-6 w-6 p-0"
                                                                        >
                                                                            <Link href={`/s/${encodeURIComponent(spaceId || 'global')}/messages/${encodeURIComponent(user.username)}`}>
                                                                                <MessageCircleIcon className="h-3 w-3" />
                                                                                <span className="sr-only">Message {user.username}</span>
                                                                            </Link>
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {bulkResults?.mostSimilar?.length === 0 && bulkResults?.mostDifferent?.length === 0 && (
                                                    <p className="text-sm text-muted-foreground text-center py-4">
                                                        No comparable users found
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </Collapsible>
        </div>
    );
} 