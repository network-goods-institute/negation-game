"use client";
import { NegateButton } from "@/components/buttons/NegateButton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ExternalLinkIcon } from "lucide-react";
import { getPointUrl } from "@/lib/negation-game/getPointUrl";
import { EndorsementControl } from "./EndorsementControl";
import RestakeDoubtControls from "./RestakeDoubtControls";

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
    isObjection?: boolean;
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
    isObjection,
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
            <NegateButton
                data-action-button="true"
                userCredAmount={viewerNegationsCred > 0 ? viewerNegationsCred : undefined}
                isActive={viewerNegationsCred > 0}
                onClick={(e) => {
                    if (e) {
                        e.stopPropagation();
                    }
                    if (privyUser === null) {
                        login();
                        return;
                    }
                    if (e && onNegate) {
                        onNegate(e);
                    }
                }}
            />

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