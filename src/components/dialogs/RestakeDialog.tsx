import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { DialogProps } from "@radix-ui/react-dialog";
import { FC } from "react";
import { cn } from "@/lib/utils/cn";
import { ReputationAnalysisDialog } from "./ReputationAnalysisDialog";

// Import our new components
import {
  RestakeDialogSuccess,
  RestakeDialogHeader,
  RestakeSliderControls,
  RestakeDialogFooter,
  CannotRestakeDialog,
  CannotDoubtDialog,
  LoadingDialog,
  RestakeDialogContent,
  useRestakeDialogState,
} from "./restake";

export interface RestakeDialogProps extends DialogProps {
  originalPoint: {
    id: number;
    content: string;
    createdAt: Date;
    stakedAmount: number;
    viewerCred?: number;
    cred: number;
    negationsCred: number;
    amountSupporters: number;
    amountNegations: number;
    favor?: number;
    restake?: {
      id: number;
      amount: number;
      active: boolean;
      originalAmount: number;
      slashedAmount: number;
      doubtedAmount: number;
      effectiveAmount?: number;
    } | null;
    slash?: {
      id: number;
      amount: number;
      active: boolean;
    } | null;
    doubt?: {
      id: number;
      amount: number;
      userAmount: number;
      isUserDoubt: boolean;
    } | null;
  };
  counterPoint: {
    id: number;
    content: string;
    createdAt: Date;
  };
  onEndorseClick?: () => void;
  openedFromSlashedIcon?: boolean;
}

export const RestakeDialog: FC<RestakeDialogProps> = ({
  originalPoint,
  counterPoint,
  open,
  onOpenChange,
  onEndorseClick,
  openedFromSlashedIcon = false,
  ...props
}) => {
  const dialogState = useRestakeDialogState({
    originalPoint,
    counterPoint,
    open: open || false,
    inDoubtMode: openedFromSlashedIcon,
  });

  // Loading states
  if (dialogState.isLoadingUser) {
    return <LoadingDialog {...props} open={open} onOpenChange={onOpenChange} />;
  }

  if (dialogState.isLoadingUserId) {
    return (
      <LoadingDialog
        {...props}
        open={open}
        onOpenChange={onOpenChange}
        isLoadingUserId={true}
      />
    );
  }

  // Success state
  if (dialogState.showSuccess && dialogState.submittedValues) {
    return (
      <RestakeDialogSuccess
        {...props}
        open={open}
        onOpenChange={onOpenChange}
        submittedValues={dialogState.submittedValues}
        openedFromSlashedIcon={openedFromSlashedIcon}
        existingDoubtIsUserDoubt={dialogState.existingDoubt?.isUserDoubt ?? false}
        originalPoint={originalPoint}
        counterPoint={counterPoint}
      />
    );
  }

  // Cannot restake (no endorsement)
  if ((originalPoint.viewerCred || 0) === 0 && !openedFromSlashedIcon) {
    return (
      <CannotRestakeDialog
        {...props}
        open={open}
        onOpenChange={onOpenChange}
        originalPoint={originalPoint}
        counterPoint={counterPoint}
        onEndorseClick={onEndorseClick}
      />
    );
  }

  // Cannot doubt
  if (openedFromSlashedIcon && !dialogState.canDoubt) {
    return (
      <CannotDoubtDialog
        {...props}
        open={open}
        onOpenChange={onOpenChange}
        isLoadingRestake={dialogState.isLoadingRestake}
        isLoadingDoubt={dialogState.isLoadingDoubt}
      />
    );
  }

  // Main dialog
  return (
    <Dialog {...props} open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex flex-col gap-4 p-4 sm:p-6 max-w-xl overflow-hidden",
          "h-[calc(100vh-2rem)] max-h-[900px]",
          "sm:max-h-[85vh]"
        )}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <RestakeDialogHeader
          openedFromSlashedIcon={openedFromSlashedIcon}
          originalPoint={originalPoint}
          endorsePopoverOpen={dialogState.endorsePopoverOpen}
          onEndorsePopoverToggle={dialogState.toggleEndorsePopoverOpen}
          credInput={dialogState.credInput}
          onCredInputChange={dialogState.setCredInput}
          notEnoughCred={dialogState.notEnoughCred}
        />

        {/* Content area - fully scrollable */}
        <RestakeDialogContent
          originalPoint={originalPoint}
          counterPoint={counterPoint}
          favorHistory={dialogState.favorHistory}
          projectedData={dialogState.projectedData}
          isLoadingHistory={dialogState.isLoadingHistory}
          timelineScale={dialogState.timelineScale}
          onTimelineScaleChange={dialogState.setTimelineScale}
          openedFromSlashedIcon={openedFromSlashedIcon}
          isSlashing={dialogState.isSlashing}
          existingRestake={dialogState.existingRestake}
          reputationData={dialogState.reputationData}
          onShowReputationAnalysis={() => dialogState.setShowReputationAnalysis(true)}
          calculations={dialogState.calculations}
          existingDoubt={dialogState.existingDoubt}
          user={dialogState.user ? { cred: dialogState.user.cred } : undefined}
          currentlyStaked={dialogState.currentRestakeAmount}
          stakedCred={dialogState.stakedCred}
          maxStakeAmount={dialogState.calculations.maxStakeAmount}
          endorsementReduced={dialogState.endorsementReduced}
        />

        {/* Footer */}
        <div className="shrink-0 border-t pt-4">
          <RestakeSliderControls
            stakedCred={dialogState.stakedCred}
            maxStakeAmount={dialogState.calculations.maxStakeAmount}
            onSliderChange={dialogState.handleSliderChange}
            openedFromSlashedIcon={openedFromSlashedIcon}
            isSlashing={dialogState.isSlashing}
            currentlyStaked={dialogState.currentRestakeAmount}
            stakeAmount={dialogState.calculations.stakeAmount}
            slashAmount={dialogState.calculations.slashAmount}
            existingDoubt={dialogState.existingDoubt}
          />

          <RestakeDialogFooter
            openedFromSlashedIcon={openedFromSlashedIcon}
            isSlashing={dialogState.isSlashing}
            favorImpact={dialogState.calculations.favorImpact}
            favorReduced={dialogState.calculations.favorReduced}
            maxStakeAmount={dialogState.calculations.maxStakeAmount}
            stakedCred={dialogState.stakedCred}
            isSubmitting={dialogState.isSubmitting}
            isSubmitDisabled={dialogState.isSubmitDisabled ?? false}
            onCancel={() => onOpenChange?.(false)}
            onSubmit={dialogState.handleSubmit}
          />
        </div>
      </DialogContent>

      <ReputationAnalysisDialog
        open={dialogState.showReputationAnalysis}
        onOpenChange={dialogState.setShowReputationAnalysis}
        restakers={dialogState.reputationData?.restakers ?? []}
        aggregateReputation={dialogState.reputationData?.aggregateReputation ?? 0}
      />
    </Dialog>
  );
};
