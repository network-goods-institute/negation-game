"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CoinsIcon, Check, Loader2 } from "lucide-react";
import { DialogProps } from "@radix-ui/react-dialog";
import { FC, useState, useEffect } from "react";
import { useCollectEarnings } from "@/mutations/useCollectEarnings";
import { useEarningsPreview } from "@/queries/useEarningsPreview";

interface EarningsDialogProps extends DialogProps {
  onOpenChange: (open: boolean) => void;
}

export const EarningsDialog: FC<EarningsDialogProps> = ({
  open,
  onOpenChange,
  ...props
}) => {
  const [collected, setCollected] = useState(false);
  const [amount, setAmount] = useState(0);

  const { data: previewAmount = 0, isLoading } = useEarningsPreview({
    enabled: open,
  });
  const { mutateAsync: collect, isPending: isCollecting } =
    useCollectEarnings();

  const handleCollect = async () => {
    try {
      const result = await collect();
      setAmount(result.totalEarnings);
      setCollected(true);
    } catch (error) {
      console.error("Failed to collect earnings:", error);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setCollected(false);
        setAmount(0);
      }, 200);
    }
  }, [open]);

  if (isLoading) {
    return (
      <Dialog {...props} open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex flex-col items-center justify-center gap-4 p-6">
          <div className="h-12 w-12 rounded-full border-4 border-t-endorsed animate-spin" />
          <DialogTitle>Loading earnings...</DialogTitle>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog {...props} open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col items-center text-center gap-6 p-6">
        {!collected ? (
          <>
            <div className="rounded-full bg-endorsed/10 p-3">
              <CoinsIcon className="size-6 text-endorsed" />
            </div>

            <div className="space-y-2">
              <DialogTitle className="text-xl">Collect Earnings</DialogTitle>
              <div className="flex items-center justify-center gap-2 text-lg">
                <span>
                  <span className="text-endorsed">
                    {previewAmount.toFixed(4)}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    cred available
                  </span>
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                (Actual amount may be lower due to rounding)
              </p>
              <div className="text-sm text-muted-foreground mt-4 text-left">
                <p className="font-medium mb-1">How to earn cred?</p>
                <p>
                  When you doubt a restake and the restaker slashes their
                  position, you earn a portion of their endorsement cred
                  proportional to your doubt amount.
                </p>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleCollect}
              disabled={isCollecting || Math.floor(previewAmount) === 0}
            >
              {isCollecting ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Collecting...
                </>
              ) : Math.floor(previewAmount) === 0 ? (
                "Not enough to collect yet"
              ) : (
                `Collect ${Math.floor(previewAmount)} cred`
              )}
            </Button>
          </>
        ) : (
          <>
            <div className="rounded-full bg-endorsed/10 p-3">
              <Check className="size-6 text-endorsed" />
            </div>

            <div className="space-y-2">
              <DialogTitle className="text-xl">Earnings Collected!</DialogTitle>
              <div className="flex items-center justify-center gap-2 text-lg">
                <span>
                  <span className="text-endorsed">{amount}</span>
                  <span className="text-muted-foreground ml-2">cred</span>
                </span>
              </div>
            </div>

            <Button className="w-full" onClick={handleClose}>
              Done
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
