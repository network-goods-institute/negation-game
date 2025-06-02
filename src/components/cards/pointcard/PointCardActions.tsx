"use client";
import React from "react";
import { AuthenticatedActionButton } from "@/components/editor/AuthenticatedActionButton";
import { NegateIcon } from "@/components/icons/NegateIcon";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ExternalLinkIcon } from "lucide-react";
import { getPointUrl } from "@/lib/negation-game/getPointUrl";
import { EndorsementControl } from "./EndorsementControl";
import RestakeDoubtControls from "./RestakeDoubtControls";
import { cn } from "@/lib/utils/cn";

export interface PointCardActionsProps {
    onNegate?: React.MouseEventHandler<HTMLButtonElement>;
    endorsedByViewer: boolean;
    viewerCred: number;
    viewerNegationsCred: number;
    privyUser: any;
    login: () => void;
    popoverOpen: boolean;
    togglePopover: () => void;
    credInput: number;
    setCredInput: (val: number) => void;
    notEnoughCred: boolean;
    isSellingMode: boolean;
    setIsSellingMode: (val: boolean) => void;
    onSubmit: () => void;
    isPending: boolean;
    inRationale: boolean;
    inGraphNode: boolean;
    pointId: number;
    currentSpace?: string;
    isInPointPage: boolean;
    isNegation: boolean;
    parentCred?: number;
    showRestakeAmount: boolean;
    restakeIsOwner?: boolean;
    restakePercentage: number;
    isOverHundred: boolean;
    onRestake: (options: { openedFromSlashedIcon: boolean }) => void;
    doubtAmount?: number;
    doubtIsUserDoubt?: boolean;
    doubtPercentage: number;
}

export const PointCardActions: React.FC<PointCardActionsProps> = ({
    onNegate,
    endorsedByViewer,
    viewerCred,
    viewerNegationsCred,
    privyUser,
    login,
    popoverOpen,
    togglePopover,
    credInput,
    setCredInput,
    notEnoughCred,
    isSellingMode,
    setIsSellingMode,
    onSubmit,
    isPending,
    inRationale,
    inGraphNode,
    pointId,
    currentSpace,
    isInPointPage,
    isNegation,
    parentCred,
    showRestakeAmount,
    restakeIsOwner,
    restakePercentage,
    isOverHundred,
    onRestake,
    doubtAmount,
    doubtIsUserDoubt,
    doubtPercentage,
}) => (
    <div className="flex gap-sm w-full text-muted-foreground">
        <div className="flex gap-sm">
            <AuthenticatedActionButton
                variant="ghost"
                className="p-1 -ml-3 -mb-2 rounded-full size-fit gap-sm hover:bg-negated/30"
                data-action-button="true"
                onClick={(e) => {
                    e.stopPropagation();
                    onNegate?.(e);
                }}
            >
                <NegateIcon className={cn(viewerNegationsCred > 0 && "text-negated")} />
                {viewerNegationsCred === 0 ? (
                    <span className="ml-0">Negate</span>
                ) : (
                    <span className="ml-0">{viewerNegationsCred} cred</span>
                )}
            </AuthenticatedActionButton>

            <EndorsementControl
                endorsedByViewer={endorsedByViewer}
                viewerCred={viewerCred}
                privyUser={privyUser}
                login={login}
                popoverOpen={popoverOpen}
                togglePopover={togglePopover}
                credInput={credInput}
                setCredInput={setCredInput}
                notEnoughCred={notEnoughCred}
                isSellingMode={isSellingMode}
                setIsSellingMode={setIsSellingMode}
                onSubmit={onSubmit}
                isPending={isPending}
            />

            {inRationale && !inGraphNode && (
                <Link
                    href={getPointUrl(pointId, currentSpace || 'global')}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-action-button="true"
                    onClick={(e) => e.stopPropagation()}
                >
                    <Button variant="ghost" className="p-1 -mb-2 rounded-full size-fit hover:bg-muted">
                        <ExternalLinkIcon className="size-5 translate-y-[2.5px]" />
                    </Button>
                </Link>
            )}

            <RestakeDoubtControls
                isInPointPage={isInPointPage}
                isNegation={isNegation}
                parentCred={parentCred}
                showRestakeAmount={showRestakeAmount}
                restakeIsOwner={restakeIsOwner}
                restakePercentage={restakePercentage}
                isOverHundred={isOverHundred}
                onRestake={onRestake}
                doubtAmount={doubtAmount}
                doubtIsUserDoubt={doubtIsUserDoubt}
                doubtPercentage={doubtPercentage}
            />
        </div>
    </div>
);

export default PointCardActions; 