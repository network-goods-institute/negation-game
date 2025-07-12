"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Search, Users, ChevronDown, ChevronUp, Loader2, ExternalLink, Crown, Filter } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { DelegateStats } from "@/types/admin";
import { fetchDelegateStats } from "@/services/admin/statisticsService";

interface DelegateStatsSectionProps {
    spaceId: string;
}

export function DelegateStatsSection({ spaceId }: DelegateStatsSectionProps) {
    const [delegateStatsExpanded, setDelegateStatsExpanded] = useState(false);
    const [delegateSearch, setDelegateSearch] = useState("");
    const [delegateSortBy, setDelegateSortBy] = useState<keyof DelegateStats>("rationalesCreated");
    const [showOnlyActive, setShowOnlyActive] = useState(true);
    const [showOnlyDelegates, setShowOnlyDelegates] = useState(false);

    const { data: delegateStats = [], isLoading: isLoadingDelegateStats } = useQuery({
        queryKey: ["delegate-stats", spaceId],
        queryFn: () => fetchDelegateStats(spaceId),
        enabled: delegateStatsExpanded,
    });

    const filteredAndSortedDelegates = delegateStats
        .filter(delegate => {
            const matchesSearch = delegate.username.toLowerCase().includes(delegateSearch.toLowerCase());
            
            if (!matchesSearch) return false;
            
            // Filter by delegate status if enabled
            if (showOnlyDelegates && !delegate.isDelegate) return false;
            
            // Filter by activity if enabled  
            if (showOnlyActive) {
                const hasActivity = delegate.pointsCreated > 0 || 
                                   delegate.rationalesCreated > 0 || 
                                   delegate.totalEndorsementsMade > 0;
                return hasActivity;
            }
            
            return true;
        })
        .sort((a, b) => {
            const aValue = a[delegateSortBy];
            const bValue = b[delegateSortBy];

            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return bValue.localeCompare(aValue);
            }
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return bValue - aValue;
            }
            return 0;
        });

    return (
        <Card>
            <CardHeader>
                <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setDelegateStatsExpanded(!delegateStatsExpanded)}
                >
                    <CardTitle className="flex items-center space-x-2">
                        <Users className="h-5 w-5" />
                        <span>Delegate Contribution Statistics</span>
                    </CardTitle>
                    {delegateStatsExpanded ? (
                        <ChevronUp className="h-5 w-5" />
                    ) : (
                        <ChevronDown className="h-5 w-5" />
                    )}
                </div>
            </CardHeader>
            {delegateStatsExpanded && (
                <CardContent className="space-y-4">
                    {/* Filters and Search */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="delegateSearch">Search Delegates</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="delegateSearch"
                                        placeholder="Search by username..."
                                        value={delegateSearch}
                                        onChange={(e) => setDelegateSearch(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="delegateSortBy">Sort By</Label>
                                <Select
                                    value={delegateSortBy}
                                    onValueChange={(value: keyof DelegateStats) => setDelegateSortBy(value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="totalCred">Total Cred</SelectItem>
                                    <SelectItem value="pointsCreated">Points Created</SelectItem>
                                    <SelectItem value="rationalesCreated">Rationales Created</SelectItem>
                                    <SelectItem value="totalEndorsementsMade">Endorsements Made</SelectItem>
                                    <SelectItem value="totalCredEndorsed">Cred Endorsed</SelectItem>
                                    <SelectItem value="totalCredReceived">Cred Received</SelectItem>
                                    <SelectItem value="lastActive">Last Active</SelectItem>
                                    <SelectItem value="username">Username</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        </div>
                        
                        {/* Filter Options */}
                        <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
                            <div className="flex items-center space-x-2">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium text-muted-foreground">Filters:</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="show-active"
                                    checked={showOnlyActive}
                                    onCheckedChange={(checked) => setShowOnlyActive(checked as boolean)}
                                />
                                <Label htmlFor="show-active" className="text-sm cursor-pointer">
                                    Show only active users
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="show-delegates"
                                    checked={showOnlyDelegates}
                                    onCheckedChange={(checked) => setShowOnlyDelegates(checked as boolean)}
                                />
                                <Label htmlFor="show-delegates" className="text-sm cursor-pointer">
                                    Show only official delegates
                                </Label>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Showing {filteredAndSortedDelegates.length} of {delegateStats.length} users
                            </div>
                        </div>
                    </div>

                    {/* Statistics Table */}
                    {isLoadingDelegateStats ? (
                        <div className="text-center py-8">
                            <Loader2 className="h-6 w-6 mx-auto animate-spin" />
                            <p className="text-sm text-muted-foreground mt-2">Loading delegate statistics...</p>
                        </div>
                    ) : filteredAndSortedDelegates.length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Delegate</TableHead>
                                        <TableHead className="text-right">Links</TableHead>
                                        <TableHead className="text-right">Cred</TableHead>
                                        <TableHead className="text-right">Points</TableHead>
                                        <TableHead className="text-right">Rationales</TableHead>
                                        <TableHead className="text-right">Endorsements Made</TableHead>
                                        <TableHead className="text-right">Endorsements Received</TableHead>
                                        <TableHead className="text-right">Last Active</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAndSortedDelegates.map((delegate) => (
                                        <TableRow key={delegate.userId}>
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-1">
                                                        <span>{delegate.username}</span>
                                                        {delegate.isDelegate && (
                                                            <Crown className="h-3 w-3 text-amber-500" />
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">
                                                        Joined {new Date(delegate.joinedDate).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {delegate.agoraLink && (
                                                        <a
                                                            href={delegate.agoraLink}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-primary hover:underline text-xs"
                                                            title="Agora Profile"
                                                        >
                                                            Agora <ExternalLink className="h-3 w-3 inline" />
                                                        </a>
                                                    )}
                                                    {delegate.scrollDelegateLink && (
                                                        <a
                                                            href={delegate.scrollDelegateLink}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-primary hover:underline text-xs"
                                                            title="Scroll Delegate"
                                                        >
                                                            Scroll <ExternalLink className="h-3 w-3 inline" />
                                                        </a>
                                                    )}
                                                    {delegate.delegationUrl && !delegate.agoraLink && !delegate.scrollDelegateLink && (
                                                        <a
                                                            href={delegate.delegationUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-primary hover:underline text-xs"
                                                            title="Delegate"
                                                        >
                                                            Delegate <ExternalLink className="h-3 w-3 inline" />
                                                        </a>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="font-medium">{delegate.totalCred.toLocaleString()}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className="font-medium">{delegate.pointsCreated}</span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className="font-medium">{delegate.rationalesCreated}</span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="font-medium">{delegate.totalEndorsementsMade} endorsements</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {delegate.totalCredEndorsed.toLocaleString()} cred given
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="font-medium">{delegate.pointsReceivingEndorsements} points endorsed</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {delegate.totalCredReceived.toLocaleString()} cred received
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className="text-sm text-muted-foreground">
                                                    {delegate.lastActive
                                                        ? new Date(delegate.lastActive).toLocaleDateString()
                                                        : "Never"
                                                    }
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-center py-4">
                            {delegateSearch ? "No delegates match your search." : "No delegate data available."}
                        </p>
                    )}
                </CardContent>
            )}
        </Card>
    );
} 