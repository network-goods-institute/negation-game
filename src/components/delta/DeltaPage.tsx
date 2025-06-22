"use client";

import { useState } from "react";
import { LoaderIcon } from "lucide-react";
import { UserSelector } from "@/components/delta/UserSelector";
import { PointSelector } from "@/components/delta/PointSelector";
import { Button } from "@/components/ui/button";
import { usePrivy } from "@privy-io/react-auth";

export default function DeltaPage() {
    const { user } = usePrivy();
    const currentUserId = user?.id;

    return (
        <div className="max-w-3xl mx-auto p-8 space-y-8">
            <h1 className="text-2xl font-bold">Δ-Score Compare</h1>
            <p className="text-muted-foreground">
                Pick a root point (cluster) and two users to see their distance.
            </p>
            <ClientCompare currentUserId={currentUserId} />
        </div>
    );
}

function ClientCompare({
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
    const ready = rootPoint && userA && userB;

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
        } catch (err) {
            console.error(err);
            setDelta(null);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <label className="font-medium">Root Point</label>
                <PointSelector onSelect={(p) => setRootPoint(p)} className="mt-2" />
                {rootPoint && (
                    <p className="text-sm text-muted-foreground mt-1">
                        Selected ID: {rootPoint.pointId}
                    </p>
                )}
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
                <div>
                    <label className="font-medium">
                        User A {currentUserId && "(default you)"}
                    </label>
                    <UserSelector onSelect={(u) => setUserA(u)} className="mt-2" />
                    {userA && (
                        <p className="text-sm text-muted-foreground mt-1">
                            {userA.username}
                        </p>
                    )}
                </div>
                <div>
                    <label className="font-medium">User B</label>
                    <UserSelector onSelect={(u) => setUserB(u)} className="mt-2" />
                    {userB && (
                        <p className="text-sm text-muted-foreground mt-1">
                            {userB.username}
                        </p>
                    )}
                </div>
            </div>
            <Button onClick={handleCompute} disabled={!ready || loading}>
                {loading ? (
                    <LoaderIcon className="animate-spin h-4 w-4" />
                ) : (
                    "Compute Δ"
                )}
            </Button>
            {delta !== undefined && (
                <div className="mt-4 text-lg font-semibold">
                    {delta === null ? (
                        noInteraction ? "No recorded interaction yet" : "Unable to compute Δ"
                    ) : (
                        `Δ = ${delta.toFixed(3)}`
                    )}
                </div>
            )}
        </div>
    );
} 