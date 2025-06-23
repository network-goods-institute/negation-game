"use client";

import { useState, useEffect } from "react";
import { LoaderIcon, UserCheckIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function UsersAlignmentCard() {
    const [data, setData] = useState<{ mostSimilar: any[]; mostDifferent: any[] } | null>();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const res = await fetch("/api/analytics/users-alignment?limit=5");
                const json = await res.json();
                setData(json);
            } catch (e) {
                console.error(e);
                setData(null);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

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
                ) : !data ? (
                    <p className="text-muted-foreground text-sm">No data</p>
                ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-medium mb-2">Most Similar</h4>
                            <div className="space-y-2 text-sm">
                                {data.mostSimilar.map((u) => (<div key={u.userId}>{u.username ?? u.userId} – Δ {u.delta.toFixed(3)}</div>))}
                            </div>
                        </div>
                        <div>
                            <h4 className="font-medium mb-2">Most Different</h4>
                            <div className="space-y-2 text-sm">
                                {data.mostDifferent.map((u) => (<div key={u.userId}>{u.username ?? u.userId} – Δ {u.delta.toFixed(3)}</div>))}
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
} 