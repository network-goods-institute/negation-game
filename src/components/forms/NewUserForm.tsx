"use client";

import { isUsernameAvailable } from "@/actions/users/isUsernameAvailable";
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
import { USERNAME_MAX_LENGTH } from "@/constants/config";
import { InsertUser, insertUserSchema } from "@/db/tables/usersTable";
import { cn } from "@/lib/utils/cn";
import { useInitUser } from "@/mutations/user/useInitUser";
import { zodResolver } from "@hookform/resolvers/zod";
import { FC, HTMLAttributes, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { ZodIssueCode } from "zod";

export interface NewUserFormProps extends HTMLAttributes<HTMLFormElement> {
  onCancel: () => void;
}

export const NewUserForm: FC<NewUserFormProps> = ({
  onCancel,
  className,
  ...props
}) => {
  const {
    mutate: initUser,
    isPending: isSubmitting,
    isSuccess,
  } = useInitUser();
  const validationInProgress = useRef<string | null>(null);

  const form = useForm<Pick<InsertUser, "username">>({
    resolver: zodResolver(
      insertUserSchema
        .pick({ username: true })
        .superRefine(async ({ username }, ctx) => {
          const formatValidation = insertUserSchema.pick({ username: true }).safeParse({ username });
          if (!formatValidation.success) {
            return;
          }

          // Prevent duplicate validations for the same username
          if (validationInProgress.current === username) {
            return;
          }
          validationInProgress.current = username;

          try {
            const isAvailable = await isUsernameAvailable(username);
            if (!isAvailable) {
              ctx.addIssue({
                path: ["username"],
                code: ZodIssueCode.custom,
                message: "username taken. choose another one",
              });
            }
          } catch (error) {
            ctx.addIssue({
              path: ["username"],
              code: ZodIssueCode.custom,
              message: "error checking username availability",
            });
          } finally {
            validationInProgress.current = null;
          }
        }),
      {
        async: true,
      }
    ),
    defaultValues: {
      username: "",
    },
    mode: "onBlur",
  });

  // No success UI; parent dialog closes immediately on success to keep user on page
  useEffect(() => {
    if (isSuccess) {
      form.reset();
    }
  }, [isSuccess, form]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(({ username }) =>
          initUser(
            { username },
            {
              onError: (error: any) => {
                const message = error?.message || "Unknown error";
                if (
                  message === "USERNAME_TAKEN" ||
                  error?.code === "USERNAME_TAKEN" ||
                  message.toLowerCase().includes("username")
                ) {
                  form.setError("username", {
                    type: "server",
                    message: "username taken. choose another one",
                  });
                } else {
                  form.setError("username", {
                    type: "server",
                    message: "could not create account — try again",
                  });
                }
              },
            }
          )
        )}
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
                  maxLength={USERNAME_MAX_LENGTH}
                  className="max-w-64"
                  {...field}
                />
              </FormControl>
              <FormMessage />

              <ul className="list-inside text-xs text-muted-foreground">
                <li className="list-disc">
                  can only contain letters, numbers and underscores
                </li>
                <li className="list-disc">
                  cannot start or end with an underscore
                </li>
              </ul>
            </FormItem>
          )}
        />

        <div className="flex flex-col md:flex-row-reverse md:gap-md pt-lg">
          <Button
            type="submit"
            className="w-full md:w-32"
            disabled={isSubmitting || isSuccess}
            rightLoading={isSubmitting}
          >
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
