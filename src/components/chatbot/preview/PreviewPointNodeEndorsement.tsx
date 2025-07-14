"use client";

import React, { useEffect, useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { EndorseButton } from "@/components/buttons/EndorseButton";
import { useCredInput } from "@/hooks/ui/useCredInput";
import { useToggle } from "@uidotdev/usehooks";
import { usePrivy } from "@privy-io/react-auth";
import { CredInput } from "@/components/inputs/CredInput";

interface PreviewPointNodeEndorsementProps {
    cred?: number;
    hasPositiveCred: boolean;
    onEndorse: (newCred: number, isSelling: boolean) => void;
}

export const PreviewPointNodeEndorsement: React.FC<PreviewPointNodeEndorsementProps> = ({
    cred = 0,
    hasPositiveCred,
    onEndorse,
}) => {
    const [endorsePopoverOpen, toggleEndorsePopoverOpen] = useToggle(false);
    const { credInput, setCredInput, notEnoughCred } = useCredInput({
        defaultValue: cred && cred > 0 ? cred : 1,
        resetWhen: !endorsePopoverOpen,
    });
    const { user: privyUser, login } = usePrivy();
    const [isSelling, setIsSelling] = useState(false);

    useEffect(() => {
        if (!endorsePopoverOpen) {
            setIsSelling(false);
            setCredInput(0);
        }
    }, [endorsePopoverOpen, setCredInput]);

    const handleTriggerClick = (e?: React.MouseEvent<HTMLButtonElement>) => {
        e?.preventDefault();
        if (!privyUser) {
            login();
        } else {
            toggleEndorsePopoverOpen();
        }
    };

    const handleConfirmClick = () => {
        const selling = isSelling;
        const amount = cred;
        const newCred = selling
            ? Math.max(0, amount - credInput)
            : amount + credInput;
        onEndorse(newCred, selling);
        toggleEndorsePopoverOpen();
    };

    return (
        <Popover open={endorsePopoverOpen} onOpenChange={toggleEndorsePopoverOpen}>
            <PopoverTrigger asChild>
                <EndorseButton
                    onClick={handleTriggerClick}
                    userCredAmount={hasPositiveCred ? cred : undefined}
                    isActive={hasPositiveCred}
                    aria-expanded={endorsePopoverOpen}
                />
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-3" onClick={(e) => e.stopPropagation()}>
                <div className="flex flex-col gap-3 w-full">
                    <CredInput
                        credInput={credInput}
                        setCredInput={setCredInput}
                        notEnoughCred={notEnoughCred}
                        endorsementAmount={cred}
                        isSelling={isSelling}
                        setIsSelling={setIsSelling}
                    />
                    <Button
                        className="w-full"
                        disabled={
                            credInput === 0 ||
                            (!isSelling && notEnoughCred) ||
                            (isSelling && credInput > cred)
                        }
                        onClick={handleConfirmClick}
                    >
                        {isSelling ? 'Sell' : 'Endorse'}
                    </Button>
                    {notEnoughCred && !isSelling && (
                        <span className="text-destructive text-sm">
                            Not enough cred
                        </span>
                    )}
                    {isSelling && credInput > cred && (
                        <span className="text-destructive text-sm">
                            Cannot sell more than endorsed
                        </span>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}; 