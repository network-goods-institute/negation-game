"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { fetchAllSpacePoints } from "@/actions/points/fetchAllSpacePoints";
import { Loader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { SearchIcon, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { encodeId } from "@/lib/negation-game/encodeId";
import { PointInSpace } from "@/actions/points/fetchAllSpacePoints";
import { PointStats } from '@/components/cards/pointcard/PointStats';

type SortOption = "recent" | "negationsAsc" | "negationsDesc" | "credAsc" | "credDesc";

export interface SelectPointForNegationDialogProps {
    isOpen?: boolean;
    open?: boolean;
    onOpenChange: (open: boolean) => void;
    onPointSelected: (id: number) => void;
}

export function SelectPointForNegationDialog({ isOpen, open, onOpenChange, onPointSelected }: SelectPointForNegationDialogProps) {
    const { user: privyUser } = usePrivy();
    const currentUserId = privyUser?.id;
    const dialogOpen = isOpen ?? open ?? false;

    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState<SortOption>("recent");
    const [filterBy, setFilterBy] = useState<"my" | "all">("my");

    const { data: points, isLoading } = useQuery<PointInSpace[]>({
        queryKey: ["space-points"],
        queryFn: fetchAllSpacePoints,
    });

    const filteredAndSortedPoints = useMemo(() => {
        let result = points ? [...points] : [];
        if (filterBy === "my" && currentUserId) {
            result = result.filter(pt => pt.createdBy === currentUserId);
        }
        if (searchTerm.trim()) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(
                pt => pt.content.toLowerCase().includes(lower) || encodeId(pt.pointId).toLowerCase().includes(lower)
            );
        }
        switch (sortBy) {
            case "negationsAsc":
                result.sort((a, b) => a.amountNegations - b.amountNegations);
                break;
            case "negationsDesc":
                result.sort((a, b) => b.amountNegations - a.amountNegations);
                break;
            case "credAsc":
                result.sort((a, b) => a.cred - b.cred);
                break;
            case "credDesc":
                result.sort((a, b) => b.cred - a.cred);
                break;
            case "recent":
            default:
                result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }
        return result;
    }, [points, searchTerm, filterBy, currentUserId, sortBy]);

    const handleSelect = (id: number) => {
        onPointSelected(id);
        onOpenChange(false);
    };
    const clearSearch = () => setSearchTerm("");
    useEffect(() => {
        if (!currentUserId) {
            setFilterBy("all");
        }
    }, [currentUserId]);

    return (
        <Dialog open={dialogOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
                <DialogHeader className="text-center px-6 pt-6 pb-4 border-b">
                    <DialogTitle className="text-xl font-semibold">Select a Point to Negate</DialogTitle>
                    <DialogDescription className="text-sm">
                        Choose an existing point from this space to propose a negation
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 p-4 border-b">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-grow">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
                            <Input
                                type="search"
                                placeholder="Search points by content or ID..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-10 pr-10 w-full"
                            />
                            {searchTerm && (
                                <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search">
                                    <XIcon className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2 justify-end flex-wrap">
                            <Select value={sortBy} onValueChange={v => setSortBy(v as SortOption)}>
                                <SelectTrigger className="w-[140px] text-sm">
                                    <SelectValue placeholder="Sort by..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="recent">Newest</SelectItem>
                                    <SelectItem value="negationsDesc">Most Negations</SelectItem>
                                    <SelectItem value="negationsAsc">Fewest Negations</SelectItem>
                                    <SelectItem value="credDesc">Highest Cred</SelectItem>
                                    <SelectItem value="credAsc">Lowest Cred</SelectItem>
                                </SelectContent>
                            </Select>
                            <Tabs value={filterBy} onValueChange={v => setFilterBy(v as "my" | "all")}>
                                <TabsList className="grid grid-cols-2 text-sm h-auto">
                                    <TabsTrigger value="my" className="px-3 py-1.5" disabled={!currentUserId}>My</TabsTrigger>
                                    <TabsTrigger value="all" className="px-3 py-1.5">All</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                        {filteredAndSortedPoints.length} {filteredAndSortedPoints.length === 1 ? 'point' : 'points'} found
                    </div>
                </div>
                <div className="p-4 h-[400px] overflow-auto">
                    {isLoading ? (
                        <Loader className="self-center" />
                    ) : filteredAndSortedPoints.length > 0 ? (
                        <div className="flex flex-col space-y-4">
                            {filteredAndSortedPoints.map((pt) => (
                                <div key={pt.pointId} className="px-4 py-2">
                                    <button
                                        onClick={() => handleSelect(pt.pointId)}
                                        className="w-full text-left p-4 bg-card rounded-md border border-border transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 flex flex-col"
                                    >
                                        <div className="flex justify-between items-start gap-4">
                                            <h3 className="flex-grow font-medium text-base leading-snug break-words">
                                                {pt.content}
                                            </h3>
                                            <PointStats
                                                className="w-auto"
                                                favor={0}
                                                amountNegations={pt.amountNegations}
                                                amountSupporters={pt.amountSupporters}
                                                cred={pt.cred}
                                            />
                                        </div>
                                        <span className="block text-xs text-muted-foreground mt-2">
                                            ID: {encodeId(pt.pointId)}
                                        </span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                            <p className="text-base font-medium">
                                {points && points.length === 0
                                    ? "No points created yet"
                                    : filterBy === 'my' && currentUserId
                                        ? "You haven't created any points yet"
                                        : "No points match your criteria"}
                            </p>
                            <p className="text-sm mt-1">
                                {points && points.length === 0
                                    ? "Create a point to get started."
                                    : filterBy === 'my' && currentUserId
                                        ? "Create one or switch to the 'All' tab."
                                        : "Try adjusting your search or filters."}
                            </p>
                        </div>
                    )}
                </div>
                <DialogFooter className="px-6 py-4 border-t">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 