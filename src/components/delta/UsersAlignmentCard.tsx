"use client";

import { useState, useEffect } from "react";
import { LoaderIcon, UserCheckIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface UsersAlignmentCardProps {
    spaceId?: string;
}

export function UsersAlignmentCard({ spaceId }: UsersAlignmentCardProps) {
    const [data, setData] = useState<{ mostSimilar: any[]; mostDifferent: any[] } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const url = spaceId
                    ? `/api/analytics/users-alignment?limit=5&spaceId=${encodeURIComponent(spaceId)}`
                    : "/api/analytics/users-alignment?limit=5";

                const res = await fetch(url);
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                }
                const json = await res.json();
                setData(json);
            } catch (e) {
                setData(null);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [spaceId]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <UserCheckIcon className="h-5 w-5" /> Users vs DAO Alignment
                </CardTitle>
                <CardDescription>Closest and furthest users compared to overall sentiment</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center py-6"><LoaderIcon className="animate-spin h-6 w-6 text-muted-foreground" /></div>
                ) : !data || (!data.mostSimilar?.length && !data.mostDifferent?.length) ? (
                    <p className="text-muted-foreground text-sm">No alignment data available</p>
                ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-medium mb-2">Most Similar</h4>
                            <div className="space-y-2 text-sm">
                                {data.mostSimilar?.length > 0 ? (
                                    data.mostSimilar.map((u) => (
                                        <div key={u.userId}>
                                            {u.username ?? u.userId} – Δ {typeof u.delta === 'number' ? u.delta.toFixed(3) : 'N/A'}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-muted-foreground text-xs">No similar users</p>
                                )}
                            </div>
                        </div>
                        <div>
                            <h4 className="font-medium mb-2">Most Different</h4>
                            <div className="space-y-2 text-sm">
                                {data.mostDifferent?.length > 0 ? (
                                    data.mostDifferent.map((u) => (
                                        <div key={u.userId}>
                                            {u.username ?? u.userId} – Δ {typeof u.delta === 'number' ? u.delta.toFixed(3) : 'N/A'}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-muted-foreground text-xs">No different users</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
} 