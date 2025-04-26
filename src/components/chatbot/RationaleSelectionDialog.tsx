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
                    (r.description || '').toLowerCase().includes(searchLower)
            );
        }
        switch (filterBy) {
            case "popular":
                const avgViews = rationales.reduce((sum, r) => sum + (r.statistics?.views || 0), 0) / (rationales.length || 1);
                const avgCred = rationales.reduce((sum, r) => sum + (r.statistics?.totalCred || 0), 0) / (rationales.length || 1);
                const avgCopies = rationales.reduce((sum, r) => sum + (r.statistics?.copies || 0), 0) / (rationales.length || 1);

                filtered = filtered.filter((r) => {
                    const views = r.statistics?.views || 0;
                    const cred = r.statistics?.totalCred || 0;
                    const copies = r.statistics?.copies || 0;

                    return views > avgViews || cred > avgCred || copies > avgCopies;
                });
                break;
            case "detailed":
                const avgDescLength = rationales.reduce((sum, r) => sum + (r.description?.length || 0), 0) / (rationales.length || 1);
                const avgGraphComplexity = rationales.reduce((sum, r) => sum + ((r.graph?.nodes.length || 0) + (r.graph?.edges.length || 0)), 0) / (rationales.length || 1);

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
                filtered.sort((a, b) => {
                    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    if (dateB !== dateA) return dateB - dateA;
                    return b.id.localeCompare(a.id);
                });
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
            <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
                <DialogHeader className="text-center px-6 pt-6 pb-4 border-b">
                    <DialogTitle className="text-xl font-semibold">Select a Rationale to Distill</DialogTitle>
                    <DialogDescription className="text-sm">
                        Choose a rationale from this space to transform into a structured essay
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 p-4 border-b">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-grow">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                            <Input
                                type="search"
                                placeholder="Search rationales by title or description..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-10 w-full"
                            />
                            {searchTerm && (
                                <button
                                    onClick={clearSearch}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    aria-label="Clear search"
                                >
                                    <XIcon className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2 justify-end flex-wrap">
                            <Select value={sortBy} onValueChange={(value: string) => setSortBy(value as SortOption)}>
                                <SelectTrigger className="w-[140px] text-sm">
                                    <SelectValue placeholder="Sort by..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="recent">Most Recent</SelectItem>
                                    <SelectItem value="views">Most Views</SelectItem>
                                    <SelectItem value="cred">Most Cred</SelectItem>
                                    <SelectItem value="copies">Most Copies</SelectItem>
                                </SelectContent>
                            </Select>
                            <Tabs value={filterBy} onValueChange={(value: string) => setFilterBy(value as FilterOption)}>
                                <TabsList className="grid grid-cols-3 text-sm h-auto">
                                    <TabsTrigger value="all" className="px-3 py-1.5">All</TabsTrigger>
                                    <TabsTrigger value="popular" className="px-3 py-1.5">Popular</TabsTrigger>
                                    <TabsTrigger value="detailed" className="px-3 py-1.5">Detailed</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    </div>

                    <div className="text-sm text-muted-foreground">
                        {filteredAndSortedRationales.length} {filteredAndSortedRationales.length === 1 ? 'rationale' : 'rationales'} found
                    </div>
                </div>

                <div
                    className="flex-grow overflow-y-auto p-4"
                    style={{ height: 'calc(100% - 210px)' }}
                >
                    {filteredAndSortedRationales.length > 0 ? (
                        <ul className="space-y-3">
                            {filteredAndSortedRationales.map((rationale) => (
                                <li key={rationale.id}>
                                    <button
                                        onClick={() => handleSelect(rationale)}
                                        className="block w-full text-left p-4 rounded-md border border-border transition-colors duration-150 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    >
                                        <div className="flex flex-col gap-2">
                                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                                <h3 className="font-medium text-base leading-snug flex-1 break-words pr-2">
                                                    {rationale.title}
                                                </h3>
                                                <div className="flex flex-wrap gap-1.5 items-center flex-shrink-0">
                                                    {rationale.statistics?.views !== undefined && (
                                                        <Badge variant="secondary" className="text-xs font-normal">
                                                            {rationale.statistics.views} views
                                                        </Badge>
                                                    )}
                                                    {rationale.statistics?.totalCred !== undefined && (
                                                        <Badge variant="secondary" className="text-xs font-normal">
                                                            {rationale.statistics.totalCred} cred
                                                        </Badge>
                                                    )}
                                                    {rationale.statistics?.copies !== undefined && rationale.statistics.copies > 0 && (
                                                        <Badge variant="secondary" className="text-xs font-normal">
                                                            {rationale.statistics.copies} copies
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            {rationale.description && (
                                                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                                    {rationale.description}
                                                </p>
                                            )}
                                            <div className="flex justify-between items-center text-xs text-muted-foreground pt-1 mt-1 border-t border-dashed">
                                                <span className="truncate pr-2">
                                                    ID: {rationale.id}
                                                </span>
                                                {rationale.createdAt && (
                                                    <span className="flex-shrink-0">
                                                        Published: {new Date(rationale.createdAt).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                            <p className="text-base font-medium">
                                {rationales.length === 0
                                    ? "No rationales created yet"
                                    : "No rationales match your criteria"}
                            </p>
                            <p className="text-sm mt-1">
                                {rationales.length === 0
                                    ? "Create a rationale to get started."
                                    : "Try adjusting your search or filters."}
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter className="px-6 py-4 border-t">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 