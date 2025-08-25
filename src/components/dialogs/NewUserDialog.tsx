"use client";

import { NewUserForm } from "../forms/NewUserForm";
import { usePrivy } from "@privy-io/react-auth";
import type { DialogProps } from '@radix-ui/react-dialog';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { FC, useState, useEffect } from "react";
import { clearPrivyCookie } from '@/actions/users/auth';
import { useInitUser } from '@/mutations/user/useInitUser';

export interface NewUserDialogProps extends DialogProps { }

export const NewUserDialog: FC<NewUserDialogProps> = ({ ...props }) => {
  const { logout } = usePrivy();
  const [open, setOpen] = useState(true);
  const { isSuccess } = useInitUser();

  // Close dialog and reload when user creation is successful
  useEffect(() => {
    if (isSuccess) {
      setOpen(false);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }, [isSuccess]);

  return (
    <Dialog {...props} open={open} onOpenChange={setOpen}>
      <DialogContent className="flex flex-col items-center justify-center overflow-auto max-h-[90vh] rounded-none sm:rounded-md gap-0 bg-background p-4 sm:p-10 shadow-sm sm:max-w-xl w-full">
        <DialogTitle className="self-center mb-2xl">{`Let's get you started`}</DialogTitle>
        <DialogDescription
          hidden
        >{`Let's set up your account`}</DialogDescription>
        <NewUserForm onCancel={async () => { await clearPrivyCookie(); logout(); }} />
      </DialogContent>
    </Dialog>
  );
};
