"use client";

import { NewUserForm } from "../forms/NewUserForm";
import { usePrivy } from "@privy-io/react-auth";
import { DialogDescription, DialogContent, DialogTitle, DialogProps, Dialog } from "@radix-ui/react-dialog";
import { FC } from "react";
import { clearPrivyCookie } from '@/app/actions/auth';

export interface NewUserDialogProps extends DialogProps { }

export const NewUserDialog: FC<NewUserDialogProps> = ({ ...props }) => {
  const { logout } = usePrivy();

  return (
    <Dialog {...props}>
      <DialogContent className=" flex flex-col items-center justify-center overflow-auto  h-screen rounded-none sm:rounded-md sm:h-fit gap-0  bg-background  p-4 sm:p-10 shadow-sm sm:max-w-xl w-full">
        <DialogTitle className="self-center mb-2xl">{`Let's get you started`}</DialogTitle>
        <DialogDescription
          hidden
        >{`Let's set up your account`}</DialogDescription>
        <NewUserForm onCancel={async () => { await clearPrivyCookie(); logout(); }} />
      </DialogContent>
    </Dialog>
  );
};
