"use client";

import { addPosition } from "@/actions/addPosition";
import { PositionForm } from "@/components/forms/PositionForm";
import { ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { SignedInButton } from "@/components/utils/SignedInButton";
import { useIsAtLeast } from "@/hooks/useIsAtLeast";
import { cn } from "@/lib/cn";
import { PositionData } from "@/schemas/PositionSchema";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { FC } from "react";
import { SubmitHandler } from "react-hook-form";
import { useBoolean } from "react-use";
import { toast } from "sonner";

export interface NewPositionButtonProps extends ButtonProps {}

export const NewPositionButton: FC<NewPositionButtonProps> = ({
  className,
  ...props
}) => {
  const [open, onOpenChange] = useBoolean(false);
  const isAtLeastMd = useIsAtLeast("md", false);
  const isAtLeastSm = useIsAtLeast("sm", false);
  const queryClient = useQueryClient();
  const submitPosition: SubmitHandler<PositionData> = async (data) => {
    const toastId = toast.loading(`Establishing position "${data.title}"`);
    onOpenChange(false);

    await addPosition(data)
      .then((positionId) => {
        toast.success(`Position "${data.title}" established: ${positionId}`, {
          id: toastId,
        });
        queryClient.invalidateQueries({ queryKey: ["feed"] });
      })
      .catch(() => {
        toast.error(`Failed to establish position "${data.title}"`, {
          id: toastId,
        });
      });
  };

  if (isAtLeastMd)
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          <SignedInButton
            className={cn(className)}
            {...props}
            size={isAtLeastSm ? "default" : "icon"}
          >
            <Plus className="inline align-baseline" />
            <span className="hidden sm:block ml-sm">New Position</span>
          </SignedInButton>
        </DialogTrigger>
        <DialogContent className="m-md flex-grow max-w-xl">
          <DialogHeader>
            <DialogTitle>Establish a position</DialogTitle>
          </DialogHeader>
          <PositionForm
            onCancel={() => onOpenChange(false)}
            onValidSubmit={submitPosition}
            className="w-full space-y-sm"
          />
        </DialogContent>
      </Dialog>
    );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>
        <SignedInButton
          className={cn(className)}
          {...props}
          size={isAtLeastSm ? "default" : "icon"}
        >
          <Plus className="inline align-baseline" />
          <span className="hidden sm:block ml-sm">New Position</span>
        </SignedInButton>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Establish a position</DrawerTitle>
        </DrawerHeader>
        <PositionForm
          onCancel={() => onOpenChange(false)}
          onValidSubmit={submitPosition}
          className="w-full space-y-sm container-padding"
        />
      </DrawerContent>
    </Drawer>
  );
};
