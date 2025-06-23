"use client";

import { useState, useEffect } from "react";
import { LoaderIcon } from "lucide-react";
import { UserSelector } from "@/components/delta/UserSelector";
import { PointSelector } from "@/components/delta/PointSelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ManualCompare({
    currentUserId,
}: {
    currentUserId?: string;
}) {
    const [rootPoint, setRootPoint] = useState<
        { pointId: number; content: string } | null
    >(null);
    const [userA, setUserA] = useState<
        { id: string; username: string } | null
    >(currentUserId ? { id: currentUserId, username: "(You)" } : null);
    const [userB, setUserB] = useState<
        { id: string; username: string } | null
    >(null);
    const [delta, setDelta] = useState<number | null | undefined>();
    const [noInteraction, setNoInteraction] = useState(false);
    const [loading, setLoading] = useState(false);
    const [noEngagementBy, setNoEngagementBy] = useState<"A" | "B" | "both" | undefined>();
    const ready = rootPoint && userA && userB;

    useEffect(() => {
        if (!userA && currentUserId) {
            setUserA({ id: currentUserId, username: "(You)" });
        }
    }, [currentUserId, userA]);

    async function handleCompute() {
        if (!ready) return;
        setLoading(true);
        setDelta(undefined);
        try {
            const res = await fetch("/api/delta", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userAId: userA.id,
                    userBId: userB.id,
                    rootPointId: rootPoint.pointId,
                }),
            });
            const data = await res.json();
            setDelta(data.delta);
            setNoInteraction(Boolean(data.noInteraction));
            setNoEngagementBy(data.noEngagementBy);
        } catch (err) {
            console.error(err);
            setDelta(null);
        } finally {
            setLoading(false);
        }
    }

    function getDeltaInterpretation(delta: number): { color: string; description: string } {
        if (delta <= 0.1) return {
            color: "text-green-600",
            description: "Strong agreement - users have very similar positions"
        };
        if (delta <= 0.3) return {
            color: "text-blue-600",
            description: "Mild agreement - mostly aligned with minor differences"
        };
        if (delta <= 0.7) return {
            color: "text-yellow-600",
            description: "Moderate disagreement - mixed alignment and conflict"
        };
        if (delta <= 0.9) return {
            color: "text-orange-600",
            description: "Strong disagreement - mostly opposing viewpoints"
        };
        return {
            color: "text-red-600",
            description: "Maximum disagreement - diametrically opposed positions"
        };
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Compare Users</CardTitle>
                <CardDescription>
                    Select a topic cluster and two users to measure their intellectual distance
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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

                <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                        <label className="text-sm font-medium">
                            User A
                        </label>
                        <UserSelector onSelect={(u) => setUserA(u)} className="mt-2" />
                        {userA && (
                            <p className="text-sm text-muted-foreground mt-1 font-medium">
                                {userA.username}
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="text-sm font-medium">User B</label>
                        <UserSelector onSelect={(u) => setUserB(u)} className="mt-2" />
                        {userB && (
                            <p className="text-sm text-muted-foreground mt-1 font-medium">
                                {userB.username}
                            </p>
                        )}
                    </div>
                </div>

                <Button
                    onClick={handleCompute}
                    disabled={!ready || loading}
                    className="w-full"
                    size="lg"
                >
                    {loading ? (
                        <>
                            <LoaderIcon className="animate-spin h-4 w-4 mr-2" />
                            Computing Δ-Score...
                        </>
                    ) : (
                        "Compute Δ-Score"
                    )}
                </Button>

                {delta !== undefined && (
                    <Card className="border-2">
                        <CardContent className="pt-6">
                            {delta === null ? (
                                <div className="text-center space-y-2">
                                    <div className="text-2xl font-bold text-muted-foreground">
                                        {noInteraction ? "No Data" : "Error"}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {noInteraction
                                            ? noEngagementBy === "A"
                                                ? "User A has no engagement with this cluster yet"
                                                : noEngagementBy === "B"
                                                    ? "User B has no engagement with this cluster yet"
                                                    : "Neither user has engagement with this cluster yet"
                                            : "Unable to compute Δ-Score at this time"
                                        }
                                    </p>
                                </div>
                            ) : (
                                <div className="text-center space-y-3">
                                    <div className={`text-4xl font-bold ${getDeltaInterpretation(delta).color}`}>
                                        Δ = {delta.toFixed(3)}
                                    </div>
                                    <div className="space-y-2">
                                        <p className="font-medium">
                                            {getDeltaInterpretation(delta).description}
                                        </p>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full transition-all duration-500 ${delta <= 0.1 ? 'bg-green-500' :
                                                    delta <= 0.3 ? 'bg-blue-500' :
                                                        delta <= 0.7 ? 'bg-yellow-500' :
                                                            delta <= 0.9 ? 'bg-orange-500' : 'bg-red-500'
                                                    }`}
                                                style={{ width: `${delta * 100}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Perfect Agreement</span>
                                            <span>Maximum Disagreement</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </CardContent>
        </Card>
    );
} 