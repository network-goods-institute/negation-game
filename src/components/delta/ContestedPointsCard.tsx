"use client";

import { useState, useEffect } from "react";
import { LoaderIcon, SwordsIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";import { logger } from "@/lib/logger";

export function ContestedPointsCard() {
    const [points, setPoints] = useState<Array<{ pointId: number; content: string; positive: number; negative: number; contestedScore: number; }> | null>();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function fetchPoints() {
            setLoading(true);
            try {
                const res = await fetch("/api/analytics/contested?limit=10");
                const data = await res.json();
                setPoints(data.points);
            } catch (err) {
                logger.error(err);
                setPoints(null);
            } finally {
                setLoading(false);
            }
        }
        fetchPoints();
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <SwordsIcon className="h-5 w-5" /> Most Contested Points
                </CardTitle>
                <CardDescription>Balanced positive vs negative stances (top 10)</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center py-6">
                        <LoaderIcon className="animate-spin h-6 w-6 text-muted-foreground" />
                    </div>
                ) : !points || points.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No contested points detected.</p>
                ) : (
                    <div className="space-y-3">
                        {points.map((p) => (
                            <div key={p.pointId} className="p-3 bg-muted rounded-md flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate" title={p.content}>{p.content}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">ID: {p.pointId}</p>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <Badge variant="outline">{p.positive} 👍</Badge>
                                    <Badge variant="outline">{p.negative} 👎</Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
} 