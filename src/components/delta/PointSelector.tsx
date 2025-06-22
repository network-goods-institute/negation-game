"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { SearchIcon, LoaderIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useQuery } from "@tanstack/react-query";
import { fetchAllSpacePoints } from "@/actions/points/fetchAllSpacePoints";
import { encodeId } from "@/lib/negation-game/encodeId";

type Point = {
    pointId: number;
    content: string;
};

type Props = {
    onSelect: (point: Point) => void;
    className?: string;
};

export function PointSelector({ onSelect, className }: Props) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const { data: points = [], isLoading } = useQuery<Point[]>({
        queryKey: ["all-space-points"],
        queryFn: () => fetchAllSpacePoints().then((pts) => pts.map((p) => ({ pointId: p.pointId, content: p.content }))),
    });

    const filtered = useMemo(() => {
        if (!query.trim()) return points.slice(0, 50);
        const lower = query.toLowerCase();
        return points.filter((p) => p.content.toLowerCase().includes(lower) || encodeId(p.pointId).toLowerCase().includes(lower)).slice(0, 50);
    }, [points, query]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div ref={containerRef} className={cn("relative", className)}>
            <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search point..."
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    className="pl-10"
                />
                {isLoading && <LoaderIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            {open && (
                <div className="absolute top-full mt-2 w-full z-50 rounded-md border bg-popover shadow-lg max-h-72 overflow-y-auto">
                    {filtered.length === 0 ? (
                        <div className="p-4 text-muted-foreground">No matches</div>
                    ) : (
                        filtered.map((p) => (
                            <button
                                key={p.pointId}
                                onClick={() => {
                                    onSelect(p);
                                    setQuery("");
                                    setOpen(false);
                                }}
                                className="block w-full text-left px-4 py-2 hover:bg-accent"
                            >
                                <div className="font-medium line-clamp-2">{p.content}</div>
                                <div className="text-xs text-muted-foreground">ID: {encodeId(p.pointId)}</div>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
} 