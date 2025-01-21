import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InfoIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DialogProps } from "@radix-ui/react-dialog";
import type { RestakerReputationResponse } from "@/queries/useRestakerReputation";

interface ReputationAnalysisDialogProps extends DialogProps {
  restakers: RestakerReputationResponse['restakers'];
  aggregateReputation: number;
}

export const ReputationAnalysisDialog = ({
  open,
  onOpenChange,
  restakers,
  aggregateReputation,
}: ReputationAnalysisDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-6">
        <div className="flex items-center justify-between">
          <DialogTitle>Reputation Analysis</DialogTitle>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-5 w-5">
                <InfoIcon className="h-4 w-4 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <p className="text-sm text-muted-foreground">
                Reputation scores indicate how reliable restakers are based on their history 
                of doubting and restaking. Higher scores mean the restaker is more likely 
                to self-slash.
              </p>
            </PopoverContent>
          </Popover>
        </div>

        <div className="mt-6 space-y-6">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <span className="text-lg font-medium">Aggregate Reputation</span>
            <span className="text-2xl">{aggregateReputation}%</span>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">Current Restakers</h3>
            <div className="space-y-3">
              {restakers.map((restaker) => (
                <div key={restaker.hashedUserId} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span>{restaker.username}</span>
                    <span className="text-xs text-muted-foreground">({restaker.hashedUserId})</span>
                  </div>
                  <span>{restaker.reputation}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 