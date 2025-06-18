import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DialogProps } from "@radix-ui/react-dialog";
import { FC } from "react";
import { ArrowLeftIcon, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface CannotRestakeDialogProps extends DialogProps {
    originalPoint: {
        content: string;
        createdAt: Date;
    };
    counterPoint: {
        content: string;
        createdAt: Date;
    };
    onEndorseClick?: () => void;
}

export const CannotRestakeDialog: FC<CannotRestakeDialogProps> = ({
    originalPoint,
    counterPoint,
    open,
    onOpenChange,
    onEndorseClick,
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
                        <DialogTitle>Cannot Restake</DialogTitle>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="flex flex-col items-center text-center gap-4">
                        <AlertCircle className="size-12 text-muted-foreground" />
                        <div className="space-y-2">
                            <h3 className="text-lg font-medium">
                                You need to endorse the original point first
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Before you can restake this point, you need to endorse it with
                                some cred.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                        <p className="text-sm text-muted-foreground font-medium">
                            Original Point
                        </p>
                        <p className="text-base">{originalPoint.content}</p>
                        <span className="text-sm text-muted-foreground block">
                            {format(originalPoint.createdAt, "h':'mm a '·' MMM d',' yyyy")}
                        </span>
                    </div>

                    <Button
                        onClick={() => {
                            onOpenChange?.(false);
                            onEndorseClick?.();
                        }}
                    >
                        Endorse Original Point
                    </Button>

                    <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Negation</p>
                        <div className="p-4 rounded-lg border border-dashed">
                            <p className="text-base">{counterPoint.content}</p>
                            <span className="text-muted-foreground text-sm mt-2 block">
                                {format(counterPoint.createdAt, "h':'mm a '·' MMM d',' yyyy")}
                            </span>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}; 