"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PositionData, PositionSchema } from "@/schemas/PositionSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { FC, HTMLAttributes } from "react";
import { SubmitHandler, useForm } from "react-hook-form";

export interface PositionFormProps extends HTMLAttributes<HTMLFormElement> {
  onValidSubmit: SubmitHandler<PositionData>;
  onCancel: () => void;
}

export const PositionForm: FC<PositionFormProps> = ({
  onValidSubmit,
  onCancel,
  ...props
}) => {
  const form = useForm<PositionData>({
    resolver: zodResolver(PositionSchema),
    defaultValues: {
      pledge: 10,
      title: "",
      description: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onValidSubmit)} {...props}>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="pledge"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pledge</FormLabel>
              <FormControl>
                <Input type="number" max={999999} className="w-20" {...field} />
              </FormControl>
              <FormMessage />
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
