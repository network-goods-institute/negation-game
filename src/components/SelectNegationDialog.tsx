import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DialogProps } from "@radix-ui/react-dialog";
import { FC, useState } from "react";
import { ArrowLeftIcon, CircleXIcon } from "lucide-react";
import { RestakeDialog } from "./RestakeDialog";
import { useToggle } from "@uidotdev/usehooks";
import { useQuery } from "@tanstack/react-query";
import { fetchPointNegations } from "@/actions/fetchPointNegations";
import { PointStats } from "./PointStats";
import { favor } from "@/lib/negation-game/favor";
import { Loader } from "./ui/loader";
import { NegationResult } from "@/actions/fetchPointNegations";

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
  const [selectedNegation, setSelectedNegation] = useState<NegationResult | null>(null);
  const [restakeDialogOpen, toggleRestakeDialog] = useToggle(false);

  const { data: negations, isLoading } = useQuery({
    queryKey: ["point-negations", originalPoint.id],
    queryFn: () => fetchPointNegations(originalPoint.id),
    enabled: open,
  });

  return (
    <>
      <Dialog {...props} open={open && !restakeDialogOpen} onOpenChange={onOpenChange}>
        <DialogContent className="flex flex-col gap-6 p-4 sm:p-6 max-w-xl">
          <div className="flex items-center gap-2">
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="text-primary">
                <ArrowLeftIcon className="size-5" />
              </Button>
            </DialogClose>
            <DialogTitle>Get higher favor</DialogTitle>
          </div>

          <div className="space-y-2">
            <p className="text-lg font-medium">{originalPoint.content}</p>
            <span className="inline-flex px-3 py-1 rounded-full bg-endorsed/10 text-endorsed text-sm">
              {favor({ 
                cred: originalPoint.stakedAmount, 
                negationsCred: originalPoint.negationsCred 
              })} favor
            </span>
          </div>

          <div className="text-sm text-muted-foreground space-y-2 bg-muted/30 p-3 rounded-md">
            <p>
              Select a counterpoint that would change your mind if it were true. Get higher favor for this point.
            </p>
          </div>

          {isLoading ? (
            <Loader className="self-center" />
          ) : negations?.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
              <CircleXIcon className="size-12 stroke-1" />
              <div className="text-center space-y-1">
                <p>No negations available</p>
                <p className="text-sm">
                  You can restake points after someone creates a negation
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {negations?.map((negation: NegationResult) => (
                <div
                  key={negation.id}
                  className="flex flex-col p-4 border rounded-md cursor-pointer hover:bg-accent"
                  onClick={() => {
                    setSelectedNegation(negation);
                    toggleRestakeDialog(true);
                  }}
                >
                  <p className="mb-2">{negation.content}</p>
                  <PointStats
                    favor={favor(negation)}
                    amountNegations={negation.amountNegations}
                    amountSupporters={negation.amountSupporters}
                    cred={negation.cred}
                  />
                </div>
              ))}
            </div>
          )}
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
            amountNegations: originalPoint.amountNegations || 0
          }}
          counterPoint={selectedNegation}
        />
      )}
    </>
  );
}; 