import { FC } from "react";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeftIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { CredInput } from "@/components/inputs/CredInput";
import { endorse } from "@/actions/endorsements/endorse";
import { useQueryClient } from "@tanstack/react-query";

interface RestakeDialogHeaderProps {
    openedFromSlashedIcon: boolean;
    originalPoint: {
        id: number;
        viewerCred?: number;
    };
    endorsePopoverOpen: boolean;
    onEndorsePopoverToggle: () => void;
    credInput: number;
    onCredInputChange: (value: number) => void;
    notEnoughCred: boolean;
}

export const RestakeDialogHeader: FC<RestakeDialogHeaderProps> = ({
    openedFromSlashedIcon,
    originalPoint,
    endorsePopoverOpen,
    onEndorsePopoverToggle,
    credInput,
    onCredInputChange,
    notEnoughCred,
}) => {
    const queryClient = useQueryClient();

    const handleEndorse = async () => {
        await endorse({
            pointId: originalPoint.id,
            cred: credInput,
        });

        queryClient.invalidateQueries({
            queryKey: ["point", originalPoint.id],
        });
        onEndorsePopoverToggle();
    };

    return (
        <div className="flex items-center justify-between gap-2 pb-2 border-b shrink-0">
            <div className="flex items-center gap-2">
                <DialogClose asChild>
                    <Button variant="ghost" size="icon" className="text-primary">
                        <ArrowLeftIcon className="size-5" />
                    </Button>
                </DialogClose>
                <DialogTitle>
                    {openedFromSlashedIcon ? "Place doubt" : "Get higher favor"}
                </DialogTitle>
            </div>

            <Popover
                open={endorsePopoverOpen}
                onOpenChange={onEndorsePopoverToggle}
            >
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        className={cn(
                            "border px-4",
                            (originalPoint.viewerCred || 0) > 0 && "text-endorsed",
                        )}
                    >
                        {(originalPoint.viewerCred || 0) > 0 ? "Endorsed" : "Endorse"}
                        {(originalPoint.viewerCred || 0) > 0 && (
                            <span className="ml-2">{originalPoint.viewerCred} cred</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="flex flex-col items-start w-96">
                    <div className="w-full flex justify-between">
                        <CredInput
                            setCredInput={onCredInputChange}
                            credInput={credInput}
                            notEnoughCred={notEnoughCred}
                        />
                        <Button
                            disabled={credInput === 0 || notEnoughCred}
                            onClick={handleEndorse}
                        >
                            Endorse
                        </Button>
                    </div>
                    {notEnoughCred && (
                        <span className="ml-md text-destructive text-sm h-fit">
                            not enough cred
                        </span>
                    )}
                </PopoverContent>
            </Popover>
        </div>
    );
}; 