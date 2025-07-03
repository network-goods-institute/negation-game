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
import { Search, Users, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { DelegateStats } from "@/types/admin";
import { fetchDelegateStats } from "@/services/admin/statisticsService";

interface DelegateStatsSectionProps {
    spaceId: string;
}

export function DelegateStatsSection({ spaceId }: DelegateStatsSectionProps) {
    const [delegateStatsExpanded, setDelegateStatsExpanded] = useState(false);
    const [delegateSearch, setDelegateSearch] = useState("");
    const [delegateSortBy, setDelegateSortBy] = useState<keyof DelegateStats>("totalCred");

    const { data: delegateStats = [], isLoading: isLoadingDelegateStats } = useQuery({
        queryKey: ["delegate-stats", spaceId],
        queryFn: () => fetchDelegateStats(spaceId),
        enabled: delegateStatsExpanded,
    });

    const filteredAndSortedDelegates = delegateStats
        .filter(delegate =>
            delegate.username.toLowerCase().includes(delegateSearch.toLowerCase())
        )
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
                                        <TableHead className="text-right">Cred</TableHead>
                                        <TableHead className="text-right">Points</TableHead>
                                        <TableHead className="text-right">Rationales</TableHead>
                                        <TableHead className="text-right">Endorsed</TableHead>
                                        <TableHead className="text-right">Received</TableHead>
                                        <TableHead className="text-right">Last Active</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAndSortedDelegates.map((delegate) => (
                                        <TableRow key={delegate.userId}>
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <span>{delegate.username}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        Joined {new Date(delegate.joinedDate).toLocaleDateString()}
                                                    </span>
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
                                                    <span className="font-medium">{delegate.totalEndorsementsMade}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {delegate.totalCredEndorsed.toLocaleString()} cred
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="font-medium">{delegate.pointsReceivingEndorsements}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {delegate.totalCredReceived.toLocaleString()} cred
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