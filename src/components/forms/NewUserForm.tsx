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

  // Show success state briefly
  useEffect(() => {
    if (isSuccess) {
      // Reset form to show success
      form.reset();
    }
  }, [isSuccess, form]);

  if (isSuccess) {
    return (
      <div className="space-y-lg">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Account Created!</h3>
          <p className="text-sm text-gray-600">Welcome to the platform!</p>
          <Button
            onClick={() => window.location.reload()}
            className="w-full mt-6"
          >
            Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(({ username }) => initUser({ username }))}
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
                  maxLength={USERNAME_MAX_LENGTH + 15}
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
