"use client";

import { addPoint } from "@/actions/addPoint";
import { PointForm } from "@/components/forms/PointForm";
import { Button, ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InsertPoint } from "@/db/schema";
import { cn } from "@/lib/cn";
import { useQueryClient } from "@tanstack/react-query";
import { useToggle } from "@uidotdev/usehooks";
import { Plus } from "lucide-react";
import { FC } from "react";
import { SubmitHandler } from "react-hook-form";
import { toast } from "sonner";

export interface NewPositionButtonProps extends ButtonProps {}

export const MakePointButton: FC<NewPositionButtonProps> = ({
  className,
  ...props
}) => {
  const [open, onOpenChange] = useToggle(false);
  const queryClient = useQueryClient();
  const submitPosition: SubmitHandler<Omit<InsertPoint, "createdBy">> = async (
    data
  ) => {
    const toastId = toast.loading(`Making Point "${data.content}"`);
    onOpenChange(false);

    await addPoint({ ...data, cred: 0 })
      .then(async (pointId) => {
        toast.success(`Point made: ${data.content}`, {
          id: toastId,
        });
        await queryClient.invalidateQueries({
          queryKey: ["feed"],
          exact: false,
        });
      })
      .catch(() => {
        toast.error(`Failed to make Point "${data.content}"`, {
          id: toastId,
        });
      });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className={cn("p-3 h-fit sm:px-4", className)} {...props}>
          <Plus className="inline align-baseline" />
          <span className="hidden  sm:block ml-sm">Make a Point</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="m-md flex-grow max-w-xl">
        <DialogHeader>
          <DialogTitle>Make a point</DialogTitle>
        </DialogHeader>
        <PointForm
          onCancel={() => onOpenChange(false)}
          onValidSubmit={submitPosition}
          className="w-full space-y-sm"
        />
      </DialogContent>
    </Dialog>
  );
};
