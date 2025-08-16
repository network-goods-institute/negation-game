"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { REGULAR_POINT_MAX_LENGTH, POINT_MIN_LENGTH } from "@/constants/config";
import { InsertPoint } from "@/db/tables/pointsTable";
import { cn } from "@/lib/utils/cn";
import { zodResolver } from "@hookform/resolvers/zod";
import { FC, HTMLAttributes } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";

export interface PositionFormProps extends HTMLAttributes<HTMLFormElement> {
  onValidSubmit: SubmitHandler<Omit<InsertPoint, "createdBy">>;
  onCancel: () => void;
}

const pointFormSchema = z.object({
  content: z.string()
    .min(POINT_MIN_LENGTH, `Content must be at least ${POINT_MIN_LENGTH} characters`)
    .max(REGULAR_POINT_MAX_LENGTH, `Content must be at most ${REGULAR_POINT_MAX_LENGTH} characters`)
});

export const PointForm: FC<PositionFormProps> = ({
  onValidSubmit,
  onCancel,
  className,
  ...props
}) => {
  const form = useForm<Omit<InsertPoint, "createdBy">>({
    resolver: zodResolver(pointFormSchema),
    defaultValues: {
      content: "",
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onValidSubmit)}
        className={cn("space-y-lg", className)}
        {...props}
      >
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <div className="flex justify-between">
                <FormLabel>Description</FormLabel>
                <FormDescription
                  className={cn(
                    field.value.length > REGULAR_POINT_MAX_LENGTH && "text-destructive"
                  )}
                >
                  {field.value.length}/{REGULAR_POINT_MAX_LENGTH}
                  {field.value.length > REGULAR_POINT_MAX_LENGTH && "!"}
                </FormDescription>
              </div>
              <FormControl>
                <Textarea rows={12} {...field} />
              </FormControl>
              {/* <FormMessage /> */}
            </FormItem>
          )}
        />

        <div className="flex flex-col md:flex-row-reverse md:gap-md pt-lg">
          <Button type="submit" className="w-full md:w-fit">
            Submit
          </Button>
          <Button
            type="reset"
            onClick={onCancel}
            variant="ghost"
            className="w-full md:w-fit"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
};
