"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CoinsIcon, Check, Loader2 } from "lucide-react";
import { DialogProps } from "@radix-ui/react-dialog";
import { FC, useState, useEffect } from "react";
import { previewEarnings, collectEarnings } from "@/actions/collectEarnings";
import { useQueryClient } from "@tanstack/react-query";

interface EarningsDialogProps extends DialogProps {
  onOpenChange: (open: boolean) => void;
}

export const EarningsDialog: FC<EarningsDialogProps> = ({
  open,
  onOpenChange,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isCollecting, setIsCollecting] = useState(false);
  const [collected, setCollected] = useState(false);
  const [amount, setAmount] = useState(0);
  const [previewAmount, setPreviewAmount] = useState(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      previewEarnings()
        .then(setPreviewAmount)
        .finally(() => setIsLoading(false));
    }
  }, [open]);

  const handleCollect = async () => {
    setIsCollecting(true);
    try {
      const earnings = await collectEarnings();
      await queryClient.invalidateQueries({ queryKey: ['user'] });
      setAmount(earnings);
      setCollected(true);
    } finally {
      setIsCollecting(false);
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
        setPreviewAmount(0);
        setIsCollecting(false);
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
                  <span className="text-endorsed">{previewAmount.toFixed(4)}</span>
                  <span className="text-muted-foreground ml-2">cred available</span>
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                (Actual amount may be lower due to rounding)
              </p>
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