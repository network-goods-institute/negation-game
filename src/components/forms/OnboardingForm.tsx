"use client";

import { isUsernameAvailable } from "@/actions/isUsernameAvailable";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { USERNAME_MAX_LENGHT } from "@/constants/config";
import { InsertUser, insertUserSchema } from "@/db/tables/usersTable";
import { cn } from "@/lib/cn";
import { zodResolver } from "@hookform/resolvers/zod";
import { FC, HTMLAttributes } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { ZodIssueCode } from "zod";

export interface OnboardingFormProps extends HTMLAttributes<HTMLFormElement> {
  onValidSubmit: SubmitHandler<Pick<InsertUser, "username">>;
  onCancel: () => void;
}

export const OnboardingForm: FC<OnboardingFormProps> = ({
  onValidSubmit,
  onCancel,
  className,
  ...props
}) => {
  const form = useForm<Pick<InsertUser, "username">>({
    resolver: zodResolver(
      insertUserSchema
        .pick({ username: true })

        .superRefine(async ({ username }, ctx) => {
          // Hack to prevent running the following query if the username is invalid
          if (
            !insertUserSchema.pick({ username: true }).safeParse({ username })
              .success
          )
            return;

          if (!(await isUsernameAvailable(username)))
            ctx.addIssue({
              path: ["username"],
              code: ZodIssueCode.custom,
              message: "username taken. choose another one",
            });
        }),
      {
        async: true,
      }
    ),
    defaultValues: {
      username: "",
    },
    mode: "onChange",
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
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input
                  maxLength={USERNAME_MAX_LENGHT + 15}
                  className="max-w-64"
                  {...field}
                />
              </FormControl>
              <FormMessage />
              <FormDescription className="text-xs">
                <ul className="list-inside">
                  <li className="list-disc">
                    can only contain letters, numbers and underscores
                  </li>
                  <li className="list-disc">
                    cannot start or end with an underscore
                  </li>
                </ul>
              </FormDescription>
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
