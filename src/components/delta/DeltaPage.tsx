"use client";

import { InfoIcon, UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { DaoAlignmentCard } from "./DaoAlignmentCard";
import { ContestedPointsCard } from "./ContestedPointsCard";
import { UsersAlignmentCard } from "./UsersAlignmentCard";
import { DiscoveryMode } from "./DiscoveryMode";
import { ManualCompare } from "./ManualCompare";
import { ErrorBoundary } from "./ErrorBoundary";

export default function DeltaPage() {
    const { user } = usePrivy();
    const currentUserId = user?.id;

    const pathname = usePathname();
    // Expected pattern: /s/[space]/delta or /s/%5Bspace%5D/delta
    let spaceId: string | null = null;
    if (pathname.startsWith("/s/")) {
        const parts = pathname.split("/");
        if (parts.length > 2) {
            try {
                spaceId = decodeURIComponent(parts[2]);
            } catch (e) {
                spaceId = parts[2];
            }
        }
    }
    const backHref = spaceId ? `/s/${spaceId}` : "/";

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8">
            <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="icon">
                    <Link href={backHref} className="flex items-center">
                        <ArrowLeftIcon className="h-5 w-5" />
                        <span className="sr-only">Back</span>
                    </Link>
                </Button>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Δ-Score Compare</h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl">Measure intellectual distance between users on controversial topics using our experimental disagreement metric.</p>

            <Alert className="border-border bg-muted text-foreground">
                <InfoIcon className="h-4 w-4 text-muted-foreground" />
                <AlertDescription className="text-foreground">
                    <strong>Experimental Feature:</strong> This Δ-Score feature is highly experimental and subject to drastic changes. Both the underlying algorithm and its display methods are actively being developed and may evolve significantly without prior notice. Results should be interpreted with extreme caution.
                </AlertDescription>
            </Alert>

            {/* DAO-wide alignment metric */}
            <ErrorBoundary>
                <DaoAlignmentCard />
            </ErrorBoundary>

            {/* Most Contested Points */}
            <ErrorBoundary>
                <ContestedPointsCard />
            </ErrorBoundary>

            {/* Users vs DAO Alignment */}
            <ErrorBoundary>
                <UsersAlignmentCard spaceId={spaceId || undefined} />
            </ErrorBoundary>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <InfoIcon className="h-5 w-5" />
                        How Δ-Score Works
                    </CardTitle>
                    <CardDescription>
                        Understanding the disagreement measurement system
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-semibold mb-2">What It Measures</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li>• <strong>Δ = 0:</strong> Perfect agreement - users have identical stances</li>
                                <li>• <strong>Δ = 1:</strong> Maximum disagreement - users are diametrically opposed</li>
                                <li>• <strong>Δ = 0.5:</strong> Moderate disagreement - some alignment, some conflict</li>
                                <li>• <strong>No data:</strong> Users haven&apos;t engaged with the topic cluster</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2">How It Works</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li>• Analyzes endorsements across a cluster of related points</li>
                                <li>• Considers both direct points and their negations</li>
                                <li>• Uses cosine similarity to measure stance alignment</li>
                                <li>• Accounts for the strength of user positions</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="discovery" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="discovery" className="flex items-center gap-2">
                        <UsersIcon className="h-4 w-4" />
                        Discovery Mode
                    </TabsTrigger>
                    <TabsTrigger value="manual" className="flex items-center gap-2">
                        Manual Compare
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="discovery" className="space-y-6">
                    <ErrorBoundary>
                        <DiscoveryMode currentUserId={currentUserId} spaceId={spaceId || undefined} />
                    </ErrorBoundary>
                </TabsContent>

                <TabsContent value="manual" className="space-y-6">
                    <ErrorBoundary>
                        <ManualCompare currentUserId={currentUserId} />
                    </ErrorBoundary>
                </TabsContent>
            </Tabs>
        </div>
    );
} 