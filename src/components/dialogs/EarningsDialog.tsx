"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CoinsIcon, Check, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { DialogProps } from "@radix-ui/react-dialog";
import { FC, useState, useEffect } from "react";
import { useCollectEarnings } from "@/mutations/epistemic/useCollectEarnings";
import { useEarningsPreview } from "@/queries/epistemic/useEarningsPreview";
import { PointCard } from "@/components/cards/PointCard";

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
  const [showEarningExplanation, setShowEarningExplanation] = useState(false);
  const [showSlashExplanation, setShowSlashExplanation] = useState(false);

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
                    {previewAmount.toFixed(0)}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    cred available
                  </span>
                </span>
              </div>
              <div className="text-sm text-muted-foreground mt-4">
                <div
                  className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setShowEarningExplanation(!showEarningExplanation)}
                >
                  <p className="font-medium">How to earn cred?</p>
                  {showEarningExplanation ? (
                    <ChevronUp className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  )}
                </div>
                {showEarningExplanation && (
                  <div className="mt-2 p-3 bg-muted/10 rounded-lg border border-muted/20 text-xs text-left space-y-2">
                    <p className="mb-2 font-medium text-sm">
                      You earn cred by doubting restakes.
                    </p>
                    <p className="mb-3">
                      You doubt by clicking the doubt button on a negation point.
                    </p>

                    {/* Example PointCard with doubt button highlighted */}
                    <div className="relative mb-4">
                      {/* Transparent overlay to prevent interactions */}
                      <div className="absolute inset-0 z-20 cursor-default" onClick={(e) => e.preventDefault()} />

                      {/* Actual PointCard component with example data */}
                      <PointCard
                        pointId={123}
                        content="This is an example negation point with a restake that you can doubt."
                        createdAt={new Date()}
                        cred={42}
                        favor={0.75}
                        amountSupporters={5}
                        amountNegations={2}
                        isNegation={true}
                        parentPoint={{
                          id: 456,
                          content: "Parent point content",
                          createdAt: new Date(),
                          cred: 100,
                          amountSupporters: 10,
                          amountNegations: 3,
                          negationsCred: 50,
                          stakedAmount: 25,
                          viewerCred: 0 // Set to 0 to disable endorsement
                        }}
                        totalRestakeAmount={30}
                        restake={{
                          id: 789,
                          amount: 20,
                          originalAmount: 20,
                          slashedAmount: 0,
                          doubtedAmount: 15,
                          isOwner: false,
                          effectiveAmount: 20
                        }}
                        doubt={{
                          id: 999,
                          amount: 15,
                          userAmount: 10,
                          isUserDoubt: true
                        }}
                        className="border"
                        // Empty handlers to prevent functionality
                        onNegate={(e) => e.preventDefault()}
                        onRestake={() => { }}
                      />
                    </div>

                    <p className="text-[10px] text-muted-foreground mb-2">
                      When you doubt a restake, you earn cred based on:
                    </p>
                    <ul className="list-disc pl-4 space-y-1.5 [&>li]:ml-4 text-[10px] text-muted-foreground">
                      <li>
                        The favor of the negation point that the restake is placed on - higher favor means higher earnings
                      </li>
                      <li>
                        The amount you&apos;ve doubted - larger doubts earn more cred
                      </li>
                      <li>
                        The time since your last earnings collection - earnings accumulate over time
                      </li>
                    </ul>
                    <p className="text-[10px] text-muted-foreground">
                      Earnings are calculated using an APY formula based on the negation&apos;s favor,
                      and are paid out from the parent point of the restake&apos;s endorsement.
                    </p>
                  </div>
                )}

                <div
                  className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-muted/30 transition-colors mt-2"
                  onClick={() => setShowSlashExplanation(!showSlashExplanation)}
                >
                  <p className="font-medium">What happens when a restake you doubted is slashed?</p>
                  {showSlashExplanation ? (
                    <ChevronUp className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  )}
                </div>
                {showSlashExplanation && (
                  <div className="mt-2 p-3 bg-muted/10 rounded-lg border border-muted/20 text-xs text-left space-y-2">
                    <ul className="list-disc pl-4 space-y-1.5 [&>li]:ml-4">
                      <li>
                        The restaker loses their favor bonus on the original point
                      </li>
                      <li>
                        You lose a portion of your doubt amount proportional to the slash
                      </li>
                      <li>
                        The restaker&apos;s credibility is affected, informing you of their likelihood to self-slash
                      </li>
                      <li>
                        Any remaining doubt continues earning cred based on the negation&apos;s favor
                      </li>
                    </ul>
                    <p>
                      By Self-Slashing, the restaker admits that they were wrong,
                      but it comes with consequences for the person that doubted them.
                    </p>
                  </div>
                )}
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
