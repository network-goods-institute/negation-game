import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DialogProps } from "@radix-ui/react-dialog";
import { FC } from "react";
import { ArrowLeftIcon } from "lucide-react";
import { Loader } from "@/components/ui/loader";

interface CannotDoubtDialogProps extends DialogProps {
    isLoadingRestake: boolean;
    isLoadingDoubt: boolean;
}

export const CannotDoubtDialog: FC<CannotDoubtDialogProps> = ({
    isLoadingRestake,
    isLoadingDoubt,
    open,
    onOpenChange,
    ...props
}) => {
    return (
        <Dialog {...props} open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="flex flex-col gap-4 p-4 sm:p-6 max-w-xl"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between gap-2 pb-2 border-b">
                    <div className="flex items-center gap-2">
                        <DialogClose asChild>
                            <Button variant="ghost" size="icon" className="text-primary">
                                <ArrowLeftIcon className="size-5" />
                            </Button>
                        </DialogClose>
                        <DialogTitle>Cannot Doubt</DialogTitle>
                    </div>
                </div>
                {isLoadingRestake || isLoadingDoubt ? (
                    <div className="flex flex-col items-center justify-center py-8">
                        <Loader className="size-6 mb-2" />
                        <p className="text-muted-foreground text-sm">Checking available restakes...</p>
                    </div>
                ) : (
                    <p className="text-muted-foreground">
                        There are no active restakes to doubt.
                    </p>
                )}
            </DialogContent>
        </Dialog>
    );
}; 