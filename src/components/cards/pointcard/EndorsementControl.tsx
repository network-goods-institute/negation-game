"use client";
import React from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { EndorseButton } from "@/components/buttons/EndorseButton";
import { CredInput } from "@/components/inputs/CredInput";

export interface EndorsementControlProps {
    endorsedByViewer: boolean;
    viewerCred: number;
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
}

export const EndorsementControl: React.FC<EndorsementControlProps> = ({
    endorsedByViewer,
    viewerCred,
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
}) => (
    <Popover open={popoverOpen} onOpenChange={togglePopover}>
        <PopoverTrigger asChild>
            <EndorseButton
                data-action-button="true"
                userCredAmount={endorsedByViewer && viewerCred > 0 ? viewerCred : undefined}
                isActive={endorsedByViewer}
                aria-expanded={popoverOpen}
                onClick={(e) => {
                    e?.preventDefault();
                    if (privyUser === null) {
                        login();
                        return;
                    }
                    togglePopover();
                }}
            />
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col gap-3 w-full">
                <CredInput
                    credInput={credInput}
                    setCredInput={setCredInput}
                    notEnoughCred={notEnoughCred}
                    endorsementAmount={viewerCred}
                    isSelling={isSellingMode}
                    setIsSelling={setIsSellingMode}
                />
                <Button
                    className="w-full"
                    disabled={
                        credInput === 0 || (!isSellingMode && notEnoughCred) || isPending
                    }
                    onClick={onSubmit}
                >
                    {isPending ? (
                        <div className="flex items-center justify-center gap-2">
                            <span className="size-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                            <span>{isSellingMode ? "Selling..." : "Endorsing..."}</span>
                        </div>
                    ) : (
                        <span>{isSellingMode ? "Sell" : "Endorse"}</span>
                    )}
                </Button>
                {notEnoughCred && !isSellingMode && (
                    <span className="text-destructive text-sm">Not enough cred</span>
                )}
                {isSellingMode && credInput > viewerCred && (
                    <span className="text-destructive text-sm">
                        Cannot sell more than endorsed amount
                    </span>
                )}
            </div>
        </PopoverContent>
    </Popover>
); 