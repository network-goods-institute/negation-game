import { OnboardingForm } from "@/components/forms/OnboardingForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePrivy } from "@privy-io/react-auth";
import { DialogProps } from "@radix-ui/react-dialog";
import { FC } from "react";

export interface OnboardingDialogProps extends DialogProps {}

export const OnboardingDialog: FC<OnboardingDialogProps> = ({ ...props }) => {
  const { logout } = usePrivy();

  return (
    <Dialog {...props}>
      <DialogContent className=" flex flex-col items-center justify-center overflow-auto  h-screen rounded-none sm:rounded-md sm:h-fit gap-0  bg-background  p-4 sm:p-10 shadow-sm sm:max-w-xl w-full">
        <DialogTitle className="self-center mb-2xl">{`Let's get you started`}</DialogTitle>
        <DialogDescription
          hidden
        >{`Let's set up your acount`}</DialogDescription>
        <OnboardingForm onCancel={logout} />
      </DialogContent>
    </Dialog>
  );
};
