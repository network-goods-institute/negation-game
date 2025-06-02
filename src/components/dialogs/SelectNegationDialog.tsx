"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DialogProps } from "@radix-ui/react-dialog";
import { FC, useState, useEffect } from "react";
import { ArrowLeftIcon, CircleXIcon, PlusIcon } from "lucide-react";
import { RestakeDialog } from "./RestakeDialog";
import { useToggle } from "@uidotdev/usehooks";
import { PointStats } from "@/components/cards/pointcard/PointStats";
import { Loader } from "@/components/ui/loader";
import { NegationResult } from "@/actions/points/fetchPointNegations";
import { usePointNegations } from "@/queries/points/usePointNegations";
import { useFavorHistory } from "@/queries/epistemic/useFavorHistory";
import { DEFAULT_TIMESCALE } from "@/constants/config";
import { useSetAtom, useAtomValue } from "jotai";
import { negatedPointIdAtom } from "@/atoms/negatedPointIdAtom";
import { usePrivy } from "@privy-io/react-auth";

interface SelectNegationDialogProps extends DialogProps {
  originalPoint: {
    id: number;
    content: string;
    createdAt: Date;
    stakedAmount: number;
    viewerCred?: number;
    amountSupporters: number;
    amountNegations: number;
    negationsCred: number;
    favor?: number;
  };
  negationId: number;
}

export const SelectNegationDialog: FC<SelectNegationDialogProps> = ({
  originalPoint,
  negationId,
  open,
  onOpenChange,
  ...props
}) => {
  const [selectedNegation, setSelectedNegation] =
    useState<NegationResult | null>(null);
  const [restakeDialogOpen, toggleRestakeDialog] = useToggle(false);
  const setNegatedPointId = useSetAtom(negatedPointIdAtom);
  const currentNegatedPointId = useAtomValue(negatedPointIdAtom);
  const { user: privyUser, login } = usePrivy();
  const [waitingForNegation, setWaitingForNegation] = useState(false);

  const { data: negations, isLoading } = usePointNegations(originalPoint.id);

  const { data: favorHistory } = useFavorHistory({
    pointId: originalPoint.id,
    timelineScale: DEFAULT_TIMESCALE,
  });

  const currentFavor = favorHistory?.length
    ? Math.floor(favorHistory[favorHistory.length - 1].favor)
    : 50;

  // Reopen dialog when negation creation is complete
  useEffect(() => {
    if (currentNegatedPointId === undefined && waitingForNegation) {
      // Force a small delay to ensure the negation dialog is fully closed
      setTimeout(() => {
        setWaitingForNegation(false);
        onOpenChange?.(true);
      }, 500); // Increased delay to ensure all state updates are complete
    }
  }, [currentNegatedPointId, waitingForNegation, onOpenChange]);

  // Reset waiting state when dialog is closed normally
  useEffect(() => {
    if (!open) {
      // Only reset if we're not in the middle of creating a negation
      if (currentNegatedPointId === undefined && !waitingForNegation) {
        setWaitingForNegation(false);
      }
    }
  }, [open, currentNegatedPointId, waitingForNegation]);

  const handleCreateNegation = () => {
    if (!privyUser) {
      login();
      return;
    }
    setWaitingForNegation(true);
    setNegatedPointId(originalPoint.id);
    onOpenChange?.(false);
  };

  return (
    <>
      <Dialog
        {...props}
        open={open && !restakeDialogOpen}
        onOpenChange={onOpenChange}
      >
        <DialogContent className="sm:top-xl flex flex-col overflow-hidden sm:translate-y-0 h-full rounded-none sm:rounded-md sm:h-fit gap-0 bg-background p-0 shadow-sm w-full max-w-xl max-h-[85vh]">
          <div className="w-full flex items-center justify-between p-4 sm:p-6 border-b">
            <DialogTitle>Get higher favor</DialogTitle>
            <DialogClose className="text-primary">
              <ArrowLeftIcon className="size-5" />
            </DialogClose>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="space-y-2 mb-6">
              <p className="text-lg font-medium">{originalPoint.content}</p>
              <span className="inline-flex px-3 py-1 rounded-full bg-endorsed/10 text-endorsed text-sm">
                {currentFavor} favor
              </span>
            </div>

            <div className="text-sm text-muted-foreground space-y-2 bg-muted/30 p-3 rounded-md mb-6">
              <p>
                Get higher favor for this point. Select a counterpoint that would
                change your mind if it were true.
              </p>
            </div>

            <Button
              variant="outline"
              className="flex items-center gap-2 w-full mb-6"
              onClick={handleCreateNegation}
            >
              <PlusIcon className="size-4" />
              Create new negation
            </Button>

            {isLoading ? (
              <Loader className="self-center" />
            ) : negations?.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
                <CircleXIcon className="size-12 stroke-1" />
                <div className="text-center space-y-1">
                  <p>No negations available</p>
                  <p className="text-sm">Create a negation to start restaking</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {negations
                  ?.filter((negation) => negation.pointId !== originalPoint.id)
                  ?.map((negation: NegationResult) => (
                    <div
                      key={negation.pointId}
                      className="flex flex-col p-4 rounded-lg border border-dashed border-border hover:bg-muted cursor-pointer"
                      onClick={() => {
                        setSelectedNegation(negation);
                        toggleRestakeDialog(true);
                      }}
                    >
                      <p className="mb-2">{negation.content}</p>
                      <PointStats
                        favor={negation.favor}
                        amountNegations={negation.amountNegations}
                        amountSupporters={negation.amountSupporters}
                        cred={negation.cred}
                      />
                    </div>
                  ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {selectedNegation && (
        <RestakeDialog
          open={restakeDialogOpen}
          onOpenChange={(isOpen) => {
            toggleRestakeDialog(isOpen);
            if (!isOpen) {
              onOpenChange?.(false);
              setSelectedNegation(null);
            }
          }}
          originalPoint={{
            ...originalPoint,
            viewerCred: originalPoint.viewerCred,
            cred: originalPoint.stakedAmount,
            negationsCred: originalPoint.negationsCred || 0,
            amountSupporters: originalPoint.amountSupporters || 0,
            amountNegations: originalPoint.amountNegations || 0,
            favor: currentFavor,
          }}
          counterPoint={{
            id: selectedNegation.pointId,
            content: selectedNegation.content,
            createdAt: selectedNegation.createdAt,
          }}
        />
      )}
    </>
  );
};
