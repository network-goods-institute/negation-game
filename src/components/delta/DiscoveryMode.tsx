"use client";

import { useState } from "react";
import { LoaderIcon, InfoIcon, UsersIcon, TrendingUpIcon, TrendingDownIcon, MessageCircleIcon } from "lucide-react";
import { PointSelector } from "@/components/delta/PointSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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

export function DiscoveryMode({ currentUserId }: { currentUserId?: string }) {
    const { login } = usePrivy();
    const [rootPoint, setRootPoint] = useState<
        { pointId: number; content: string } | null
    >(null);
    const [bulkResults, setBulkResults] = useState<BulkDeltaResult | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleDiscover() {
        if (!rootPoint || !currentUserId) return;
        setLoading(true);
        setBulkResults(null);

        try {
            const res = await fetch("/api/delta/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    referenceUserId: currentUserId,
                    rootPointId: rootPoint.pointId,
                    limit: 10,
                }),
            });
            if (res.status === 401) {
                const refreshed = await setPrivyToken();
                if (refreshed) {
                    return await handleDiscover();
                }
                login();
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
        if (delta <= 0.1) return "bg-green-100 text-green-800";
        if (delta <= 0.3) return "bg-blue-100 text-blue-800";
        if (delta <= 0.7) return "bg-yellow-100 text-yellow-800";
        if (delta <= 0.9) return "bg-orange-100 text-orange-800";
        return "bg-red-100 text-red-800";
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <UsersIcon className="h-5 w-5" />
                    Discover Similar & Different Users
                </CardTitle>
                <CardDescription>
                    Select a topic cluster to automatically find users who agree/disagree with you most
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {!currentUserId && (
                    <Alert>
                        <InfoIcon className="h-4 w-4" />
                        <AlertDescription>
                            Please sign in to use Discovery Mode
                        </AlertDescription>
                    </Alert>
                )}

                <div>
                    <label className="text-sm font-medium">Root Point (Topic Cluster)</label>
                    <PointSelector onSelect={(p) => setRootPoint(p)} className="mt-2" />
                    {rootPoint && (
                        <div className="mt-2 p-3 bg-muted rounded-md">
                            <p className="text-sm font-medium">Selected Point:</p>
                            <p className="text-sm text-muted-foreground truncate">{rootPoint.content}</p>
                            <p className="text-xs text-muted-foreground">ID: {rootPoint.pointId}</p>
                        </div>
                    )}
                </div>

                <Button
                    onClick={handleDiscover}
                    disabled={!rootPoint || !currentUserId || loading}
                    className="w-full"
                    size="lg"
                >
                    {loading ? (
                        <>
                            <LoaderIcon className="animate-spin h-4 w-4 mr-2" />
                            Analyzing Users...
                        </>
                    ) : (
                        <>
                            <UsersIcon className="h-4 w-4 mr-2" />
                            Discover User Alignment
                        </>
                    )}
                </Button>

                {bulkResults && (
                    <div className="space-y-6">
                        {bulkResults.message && (
                            <Alert>
                                <InfoIcon className="h-4 w-4" />
                                <AlertDescription>{bulkResults.message}</AlertDescription>
                            </Alert>
                        )}

                        {bulkResults.totalUsers > 0 && (
                            <div className="text-center text-sm text-muted-foreground">
                                Found {bulkResults.totalUsers} comparable users from {bulkResults.totalEngaged} total engaged users
                            </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Most Similar Users */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <TrendingUpIcon className="h-5 w-5 text-green-600" />
                                        Most Similar
                                    </CardTitle>
                                    <CardDescription>Users who agree with you most</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {bulkResults?.mostSimilar?.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-4">
                                            No similar users found
                                        </p>
                                    ) : (
                                        <div className="space-y-3">
                                            {bulkResults.mostSimilar.map((user) => (
                                                <div key={user.userId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                                    <div className="flex-1">
                                                        <p className="font-medium">{user.username}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {user.totalEngagement} total engagement
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge className={getDeltaBadgeColor(user.delta)}>
                                                            Δ = {user.delta.toFixed(3)}
                                                        </Badge>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            asChild
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            <Link href={`/messages/${encodeURIComponent(user.username)}`}>
                                                                <MessageCircleIcon className="h-4 w-4" />
                                                                <span className="sr-only">Message {user.username}</span>
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Most Different Users */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <TrendingDownIcon className="h-5 w-5 text-red-600" />
                                        Most Different
                                    </CardTitle>
                                    <CardDescription>Users who disagree with you most</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {bulkResults?.mostDifferent?.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-4">
                                            No different users found
                                        </p>
                                    ) : (
                                        <div className="space-y-3">
                                            {bulkResults.mostDifferent.map((user) => (
                                                <div key={user.userId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                                    <div className="flex-1">
                                                        <p className="font-medium">{user.username}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {user.totalEngagement} total engagement
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge className={getDeltaBadgeColor(user.delta)}>
                                                            Δ = {user.delta.toFixed(3)}
                                                        </Badge>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            asChild
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            <Link href={`/messages/${encodeURIComponent(user.username)}`}>
                                                                <MessageCircleIcon className="h-4 w-4" />
                                                                <span className="sr-only">Message {user.username}</span>
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
} 