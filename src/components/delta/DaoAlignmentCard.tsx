"use client";

import { useState, useEffect } from "react";
import { LoaderIcon, GaugeIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";import { logger } from "@/lib/logger";

export function DaoAlignmentCard() {
    const [daoDelta, setDaoDelta] = useState<number | null | undefined>();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function fetchDao() {
            setLoading(true);
            try {
                const res = await fetch("/api/delta/dao");
                const data = await res.json();
                setDaoDelta(data.delta);
            } catch (e) {
                logger.error("Failed to fetch DAO Δ", e);
                setDaoDelta(null);
            } finally {
                setLoading(false);
            }
        }
        fetchDao();
    }, []);

    function getDeltaInterpretation(delta: number): { color: string; label: string } {
        if (delta <= 0.1) return { color: "text-green-600", label: "High agreement" };
        if (delta <= 0.3) return { color: "text-blue-600", label: "Mild agreement" };
        if (delta <= 0.7) return { color: "text-yellow-600", label: "Moderate disagreement" };
        if (delta <= 0.9) return { color: "text-orange-600", label: "Strong disagreement" };
        return { color: "text-red-600", label: "Polarised" };
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <GaugeIcon className="h-5 w-5" />
                    DAO-wide Alignment
                </CardTitle>
                <CardDescription>Average pair-wise Δ across all engaged users (sampled)</CardDescription>
            </CardHeader>
            <CardContent className="py-6 flex items-center justify-center">
                {loading ? (
                    <LoaderIcon className="animate-spin h-6 w-6 text-muted-foreground" />
                ) : daoDelta === null ? (
                    <span className="text-muted-foreground">No data yet</span>
                ) : daoDelta === undefined ? (
                    <span className="text-muted-foreground">Error</span>
                ) : (
                    <div className="text-center space-y-1">
                        <div className={`text-4xl font-bold ${getDeltaInterpretation(daoDelta).color}`}>Δ = {daoDelta.toFixed(3)}</div>
                        <div className="text-sm text-muted-foreground">{getDeltaInterpretation(daoDelta).label}</div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}