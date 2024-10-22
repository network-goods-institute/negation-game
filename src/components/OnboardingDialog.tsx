import { initUser } from "@/actions/initUser";
import { OnboardingForm } from "@/components/forms/OnboardingForm";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { usePrivy } from "@privy-io/react-auth";
import { DialogProps } from "@radix-ui/react-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { FC } from "react";

export interface OnboardingDialogProps extends DialogProps {}

export const OnboardingDialog: FC<OnboardingDialogProps> = ({ ...props }) => {
  const { logout } = usePrivy();
  const { invalidateQueries } = useQueryClient();
  return (
    <Dialog {...props}>
      <DialogContent className=" flex flex-col items-center justify-center overflow-auto  h-screen rounded-none sm:rounded-md sm:h-fit gap-0  bg-background  p-4 sm:p-10 shadow-sm sm:max-w-xl w-full">
        <DialogTitle className="self-center mb-2xl">{`Let's get you started`}</DialogTitle>
        <OnboardingForm
          className=""
          onCancel={logout}
          onValidSubmit={({ username }) =>
            initUser({ username }).then(() => {
              invalidateQueries({ exact: false, queryKey: ["user"] });
            })
          }
        />
      </DialogContent>
    </Dialog>
  );
};
