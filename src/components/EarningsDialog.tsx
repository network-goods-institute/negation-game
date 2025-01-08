"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CoinsIcon, Check, Loader2 } from "lucide-react";
import { DialogProps } from "@radix-ui/react-dialog";
import { FC, useState, useEffect } from "react";
import { previewEarnings, collectEarnings } from "@/actions/collectEarnings";

interface EarningsDialogProps extends DialogProps {
  onOpenChange: (open: boolean) => void;
}

export const EarningsDialog: FC<EarningsDialogProps> = ({
  open,
  onOpenChange,
  ...props
}) => {
  const [isCollecting, setIsCollecting] = useState(false);
  const [collected, setCollected] = useState(false);
  const [amount, setAmount] = useState(0);
  const [previewAmount, setPreviewAmount] = useState(0);

  useEffect(() => {
    if (open) {
      previewEarnings().then(setPreviewAmount);
    }
  }, [open]);

  const handleCollect = async () => {
    setIsCollecting(true);
    const earnings = await collectEarnings();
    setAmount(earnings);
    setCollected(true);
    setIsCollecting(false);
  };

  const handleClose = () => {
    setCollected(false);
    onOpenChange(false);
  };

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
                <CoinsIcon className="size-5" />
                <span>
                  {previewAmount.toFixed(4)} <span className="text-muted-foreground">cred available</span>
                </span>
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={handleCollect}
              disabled={isCollecting || Math.floor(previewAmount) === 0}
            >
              {isCollecting ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
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
                <CoinsIcon className="size-5" />
                <span>
                  {amount} <span className="text-muted-foreground">cred</span>
                </span>
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={handleClose}
            >
              Done
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}; 