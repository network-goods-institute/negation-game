"use client";

import { useUser } from "@/queries/users/useUser";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { UserIcon, CoinsIcon, InfoIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import { useEarningsPreview } from "@/queries/epistemic/useEarningsPreview";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { EarningsDialog } from "@/components/dialogs/EarningsDialog";

export function UserProfilePreview() {
    const { user: privyUser } = usePrivy();
    const router = useRouter();
    const { data: userData, isLoading } = useUser(privyUser?.id);
    const [earningsDialogOpen, setEarningsDialogOpen] = useState(false);
    
    const { data: earningsPreview = 0 } = useEarningsPreview({
        enabled: !!privyUser
    });

    if (!privyUser) {
        return null;
    }

    if (isLoading) {
        return (
            <div className="p-4 border rounded-lg bg-card animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                    <div className="size-10 rounded-full bg-muted" />
                    <div className="flex-1">
                        <div className="h-4 w-24 mb-1 bg-muted rounded" />
                        <div className="h-3 w-16 bg-muted rounded" />
                    </div>
                </div>
                <div className="h-8 w-full bg-muted rounded" />
            </div>
        );
    }

    const handleProfileClick = () => {
        router.push(`/profile/${userData?.username || privyUser.id}`);
    };

    return (
        <>
            <div className="p-4 border rounded-lg bg-card transition-colors">
                <div className="flex items-center gap-3 mb-3">
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserIcon className="size-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">
                            {userData?.username || "Anonymous"}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CoinsIcon className="size-3" />
                            <span>{userData?.cred || 0} cred</span>
                            {earningsPreview > 0 && (
                                <>
                                    <span className="text-muted-foreground">•</span>
                                    <span className="text-endorsed">
                                        +{earningsPreview < 0.01 ? "< 0.01" : earningsPreview.toFixed(0)} available
                                    </span>
                                </>
                            )}
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button className="ml-1 hover:text-foreground transition-colors">
                                            <InfoIcon className="size-3" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="max-w-[200px]">
                                        <p className="font-medium mb-1">How to gain cred:</p>
                                        <ul className="list-disc list-inside space-y-1 text-xs">
                                            <li>Create valuable points and rationales</li>
                                            <li>Doubt restakes that won't be slashed</li>
                                            <li>Collect earnings from successful doubts</li>
                                        </ul>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={handleProfileClick}
                    >
                        View Profile
                    </Button>
                    <Button
                        variant={earningsPreview > 0 ? "default" : "outline"}
                        size="sm"
                        className="w-full"
                        onClick={() => setEarningsDialogOpen(true)}
                    >
                        <CoinsIcon className="size-3 mr-1" />
                        {earningsPreview > 0 ? "Collect Earnings" : "Check Earnings"}
                    </Button>
                </div>
            </div>
            
            {earningsDialogOpen && (
                <Suspense fallback={null}>
                    <EarningsDialog
                        open={earningsDialogOpen}
                        onOpenChange={setEarningsDialogOpen}
                    />
                </Suspense>
            )}
        </>
    );
}