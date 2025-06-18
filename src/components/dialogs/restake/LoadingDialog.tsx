import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import { DialogProps } from "@radix-ui/react-dialog";
import { FC } from "react";
import { Loader } from "@/components/ui/loader";

interface LoadingDialogProps extends DialogProps {
    isLoadingUserId?: boolean;
}

export const LoadingDialog: FC<LoadingDialogProps> = ({
    isLoadingUserId = false,
    open,
    onOpenChange,
    ...props
}) => {
    return (
        <Dialog {...props} open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className={
                    isLoadingUserId
                        ? "flex flex-col items-center justify-center gap-4 p-4 sm:p-6 max-w-xl min-h-[200px]"
                        : "flex items-center justify-center p-6"
                }
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
            >
                {isLoadingUserId && <DialogTitle className="sr-only">Loading</DialogTitle>}
                <Loader className={isLoadingUserId ? "size-8" : "size-6"} />
            </DialogContent>
        </Dialog>
    );
}; 