"use client";

import { useState, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatRationale } from "@/types/chat";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SearchIcon, XIcon } from "lucide-react";

type SortOption = "recent" | "views" | "cred" | "copies";
type FilterOption = "all" | "popular" | "detailed";

interface RationaleSelectionDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    rationales: ChatRationale[];
    onRationaleSelected: (rationale: ChatRationale) => void;
}

export function RationaleSelectionDialog({
    isOpen,
    onOpenChange,
    rationales,
    onRationaleSelected,
}: RationaleSelectionDialogProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState<SortOption>("recent");
    const [filterBy, setFilterBy] = useState<FilterOption>("all");

    const filteredAndSortedRationales = useMemo(() => {
        let filtered = [...rationales];
        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(
                (r) =>
                    r.title.toLowerCase().includes(searchLower) ||
                    r.description?.toLowerCase().includes(searchLower)
            );
        }
        switch (filterBy) {
            case "popular":
                const avgViews = rationales.reduce((sum, r) => sum + (r.statistics?.views || 0), 0) / rationales.length;
                const avgCred = rationales.reduce((sum, r) => sum + (r.statistics?.totalCred || 0), 0) / rationales.length;
                const avgCopies = rationales.reduce((sum, r) => sum + (r.statistics?.copies || 0), 0) / rationales.length;

                filtered = filtered.filter((r) => {
                    const views = r.statistics?.views || 0;
                    const cred = r.statistics?.totalCred || 0;
                    const copies = r.statistics?.copies || 0;

                    return views > avgViews || cred > avgCred || copies > avgCopies;
                });
                break;
            case "detailed":
                const avgDescLength = rationales.reduce((sum, r) => sum + (r.description?.length || 0), 0) / rationales.length;
                const avgGraphComplexity = rationales.reduce((sum, r) => sum + ((r.graph?.nodes.length || 0) + (r.graph?.edges.length || 0)), 0) / rationales.length;

                filtered = filtered.filter((r) => {
                    const descLength = r.description?.length || 0;
                    const graphComplexity = (r.graph?.nodes.length || 0) + (r.graph?.edges.length || 0);

                    return descLength > avgDescLength || graphComplexity > avgGraphComplexity;
                });
                break;
        }

        switch (sortBy) {
            case "views":
                filtered.sort((a, b) => (b.statistics?.views || 0) - (a.statistics?.views || 0));
                break;
            case "cred":
                filtered.sort((a, b) => (b.statistics?.totalCred || 0) - (a.statistics?.totalCred || 0));
                break;
            case "copies":
                filtered.sort((a, b) => (b.statistics?.copies || 0) - (a.statistics?.copies || 0));
                break;
            case "recent":
            default:
                filtered.sort((a, b) => b.id.localeCompare(a.id));
                break;
        }

        return filtered;
    }, [rationales, searchTerm, sortBy, filterBy]);

    const handleSelect = (rationale: ChatRationale) => {
        onRationaleSelected(rationale);
        setSearchTerm("");
        onOpenChange(false);
    };

    const clearSearch = () => setSearchTerm("");

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col overflow-hidden">
                <DialogHeader className="text-center pt-6 pb-4 border-b">
                    <DialogTitle className="text-2xl font-bold">Select a Rationale to Distill</DialogTitle>
                    <DialogDescription>
                        Choose a rationale from this space to transform into a structured essay
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-4 px-4">
                    <div className="flex flex-col gap-4 sm:flex-row">
                        <div className="relative flex-1">
                            <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search rationales..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-8"
                            />
                            {searchTerm && (
                                <button
                                    onClick={clearSearch}
                                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                                >
                                    <XIcon className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Select value={sortBy} onValueChange={(value: string) => setSortBy(value as SortOption)}>
                                <SelectTrigger className="w-[130px] hover:bg-accent hover:text-accent-foreground">
                                    <SelectValue placeholder="Sort by..." />
                                </SelectTrigger>
                                <SelectContent className="min-w-[130px]">
                                    <SelectItem value="recent">Most Recent</SelectItem>
                                    <SelectItem value="views">Most Views</SelectItem>
                                    <SelectItem value="cred">Most Cred</SelectItem>
                                    <SelectItem value="copies">Most Copies</SelectItem>
                                </SelectContent>
                            </Select>
                            <Tabs value={filterBy} onValueChange={(value: string) => setFilterBy(value as FilterOption)} className="w-full sm:w-auto">
                                <TabsList className="grid w-full grid-cols-3 sm:w-[300px]">
                                    <TabsTrigger value="all" title="Show all rationales">All</TabsTrigger>
                                    <TabsTrigger value="popular" title="Show rationales with views, cred, or favor">Popular</TabsTrigger>
                                    <TabsTrigger value="detailed" title="Show rationales with descriptions or graphs">Detailed</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    </div>

                    <div className="text-sm text-muted-foreground">
                        {filteredAndSortedRationales.length} {filteredAndSortedRationales.length === 1 ? 'rationale' : 'rationales'} found
                    </div>
                </div>

                <ScrollArea className="flex-1 w-full overflow-y-auto">
                    <div className="p-4 space-y-3">
                        {filteredAndSortedRationales.length > 0 ? (
                            filteredAndSortedRationales.map((rationale) => (
                                <button
                                    key={rationale.id}
                                    onClick={() => handleSelect(rationale)}
                                    className="w-full mx-auto group rounded-lg border bg-card text-card-foreground p-4 hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <div className="flex flex-col gap-2">
                                        <div className="flex justify-between items-start gap-4">
                                            <h3 className="font-semibold text-left">{rationale.title}</h3>
                                            <div className="flex gap-2 flex-wrap justify-end items-center">
                                                {rationale.statistics?.views !== undefined && (
                                                    <Badge variant="secondary" className="whitespace-nowrap">
                                                        {rationale.statistics.views} views
                                                    </Badge>
                                                )}
                                                {rationale.statistics?.totalCred !== undefined && (
                                                    <Badge variant="secondary" className="whitespace-nowrap">
                                                        {rationale.statistics.totalCred} cred
                                                    </Badge>
                                                )}
                                                {rationale.statistics?.copies !== undefined && rationale.statistics.copies > 0 && (
                                                    <Badge variant="secondary" className="whitespace-nowrap">
                                                        {rationale.statistics.copies} copies
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        {rationale.description && (
                                            <p className="text-sm text-muted-foreground text-left line-clamp-2">
                                                {rationale.description}
                                            </p>
                                        )}
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-muted-foreground">
                                                ID: {rationale.id}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                Published: {new Date(rationale.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                {rationales.length === 0 ? (
                                    <p>You haven&apos;t created any rationales yet.</p>
                                ) : (
                                    <p>No rationales match your search criteria.</p>
                                )}
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter className="mt-auto px-4 pb-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 